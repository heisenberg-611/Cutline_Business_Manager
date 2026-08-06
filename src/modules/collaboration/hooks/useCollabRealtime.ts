'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'
// Type-only: erased at compile time, so it does not pull the SDK into SSR.
import type {
  ErrorInfo,
  InboundMessage,
  PresenceMessage,
  Realtime,
  RealtimeChannel,
  TokenDetails,
  TokenRequest,
} from 'ably'
import {
  projectCollabChannel,
  COLLAB_EVENT,
  type CollabRefreshPayload,
  type CollabCommentPayload,
} from '@/lib/ably/channels'
import type { PresenceViewer } from '@/components/PresenceAvatars'
import type { FlatComment } from '../comment-tree'

/**
 * A comment as it arrived, with who caused it.
 *
 * The actor is kept beside the comment rather than folded into it: on a delete
 * they can be an admin moderating someone else's post, so the activity line
 * needs them separately from the author.
 */
export type RemoteCommentEvent = {
  comment: FlatComment
  actorUserId: string
  actorName: string | null
}

// Long enough to collapse a burst — a drag-reorder writes every row — without
// being noticeable as lag on a single click.
const REFRESH_DEBOUNCE_MS = 250

/**
 * Keeps a project's collaboration page current while someone else edits it.
 *
 * The page renders tasks from the server, and revalidatePath only refreshes the
 * router of whoever performed the action. So a second viewer sat on the payload
 * from when they loaded the page: a task completed by one person stayed
 * unchecked for everyone else until they navigated away and back.
 *
 * The signal carries no task data. It calls router.refresh(), which re-runs the
 * server component — access is re-checked there, so nothing is trusted off the
 * channel.
 *
 * Ably is imported dynamically so it never runs during SSR, matching
 * usePipelineRealtime and AblyProvider.
 */
export function useCollabRealtime(projectId: string) {
  const { orgId, userId } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [viewers, setViewers] = useState<PresenceViewer[]>([])
  // Comments that arrived over the wire, newest write per id. Merged over the
  // server's copy by the pane rather than replacing it, so a reader who has
  // been here a while and one who just loaded see the same thread.
  const [remoteComments, setRemoteComments] = useState<Map<string, RemoteCommentEvent>>(
    () => new Map()
  )

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Someone'
  const imageUrl = user?.imageUrl ?? null

  // Identity is pushed with presence.update() from a ref rather than sitting in
  // the subscription effect's dependencies: Clerk's useUser() resolves after
  // first render, so depending on it would tear down and rebuild the whole
  // WebSocket the moment the name loads.
  const identityRef = useRef<{ name: string; imageUrl: string | null }>({
    name: 'Someone',
    imageUrl: null,
  })
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Declared before the subscription effect so the identity is populated by the
  // time presence.enter() runs on mount.
  useEffect(() => {
    identityRef.current = { name: displayName, imageUrl }
    channelRef.current?.presence.update(identityRef.current).catch(() => {})
  }, [displayName, imageUrl])

  useEffect(() => {
    if (!orgId || !userId || !projectId) return

    let cancelled = false
    let client: Realtime | null = null
    let channel: RealtimeChannel | null = null

    import('ably')
      .then(({ Realtime: AblyRealtime }) => {
        if (cancelled) return

        client = new AblyRealtime({
          authCallback: async (
            _params,
            callback: (
              error: ErrorInfo | string | null,
              tokenRequestOrDetails: TokenDetails | TokenRequest | string | null
            ) => void
          ) => {
            try {
              const res = await fetch('/api/ably/auth')
              if (!res.ok) throw new Error(`Ably auth failed: ${res.status}`)
              callback(null, await res.json())
            } catch (err) {
              callback(err as ErrorInfo, null)
            }
          },
        })

        channel = client.channels.get(projectCollabChannel(orgId, projectId))
        channelRef.current = channel

        // subscribe() implicitly attaches and returns a promise; an in-flight
        // attach rejects with "Connection closed" when teardown closes the client.
        channel
          .subscribe(COLLAB_EVENT.refresh, (message: InboundMessage) => {
            const payload = message.data as CollabRefreshPayload | undefined
            // Skip the echo of our own edit: the action already refreshed this
            // router, and refreshing again mid-transition would discard the
            // optimistic state before the server value has landed.
            if (!payload || payload.actorUserId === userId) return

            if (timerRef.current) clearTimeout(timerRef.current)
            timerRef.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS)
          })
          ?.catch(() => {})

        channel
          .subscribe(COLLAB_EVENT.comment, (message: InboundMessage) => {
            const payload = message.data as CollabCommentPayload | undefined
            // Our own comment is already on screen from the server round trip.
            if (!payload?.comment || payload.actorUserId === userId) return

            const wire = payload.comment
            setRemoteComments((prev) => {
              const next = new Map(prev)
              next.set(wire.id, {
                actorUserId: payload.actorUserId,
                actorName: payload.actorName ?? null,
                comment: {
                  ...wire,
                  // Dates cross the wire as strings.
                  createdAt: new Date(wire.createdAt),
                  editedAt: wire.editedAt ? new Date(wire.editedAt) : null,
                },
              })
              return next
            })
          })
          ?.catch(() => {})

        const syncPresence = async () => {
          try {
            const members: PresenceMessage[] = (await channel?.presence.get()) ?? []
            if (cancelled) return
            const unique = new Map<string, PresenceViewer>()
            for (const m of members) {
              // Keyed by clientId, so one person in three tabs shows once.
              if (m.clientId && m.clientId !== userId) {
                unique.set(m.clientId, {
                  clientId: m.clientId,
                  name: m.data?.name ?? 'Someone',
                  imageUrl: m.data?.imageUrl ?? null,
                })
              }
            }
            setViewers([...unique.values()])
          } catch {
            // Presence is decorative; a failure must not break the page.
          }
        }

        channel.presence.subscribe(['enter', 'leave', 'update'], syncPresence)?.catch(() => {})
        channel.presence.enter(identityRef.current).then(syncPresence).catch(() => {})
      })
      .catch((err) => console.error('Failed to load Ably for collaboration:', err))

    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
      channelRef.current = null

      const closingChannel = channel
      const closingClient = client

      try {
        closingChannel?.unsubscribe()
        closingChannel?.presence.unsubscribe()
      } catch {
        // Already detached.
      }

      // presence.leave() is asynchronous and close() rejects whatever is still
      // in flight, which surfaced as an unhandled "Connection closed" rejection
      // on the pipeline board. Wait for the leave either way.
      Promise.resolve(closingChannel?.presence.leave())
        .catch(() => {})
        .finally(() => {
          try {
            closingClient?.close()
          } catch {
            // Already closing.
          }
        })
    }
  }, [orgId, userId, projectId, router])

  return { viewers, remoteComments }
}
