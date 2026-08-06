'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  type CollabTasksPayload,
  type CollabMembersPayload,
} from '@/lib/ably/channels'
import type { PresenceViewer } from '@/components/PresenceAvatars'
import type { FlatComment } from '../comment-tree'
import type { TaskRow } from '../actions/tasks'
import type { ActivityEntry } from '../actions/activity'

/**
 * A comment as it arrived, with who caused it.
 *
 * The actor is kept beside the comment rather than folded into it: on a delete
 * they can be an admin moderating someone else's post, so the activity line
 * needs them separately from the author.
 */
/**
 * The shape both sources of a task change share.
 *
 * The channel payload also names its actor; the actor's own action result does
 * not need to. Only these three fields are applied, so this is what the applier
 * asks for.
 */
/**
 * A roster change, from either source. `memberIds` is absent on the actor's own
 * result — they cannot have removed themselves and then acted.
 */
export type ApplicableMemberChange = {
  at: number
  members: unknown[]
  memberIds?: string[]
}

export type ApplicableTaskChange = {
  at: number
  tasks: unknown[]
  activity: unknown | null
}

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
  // The task list as last broadcast. Null until one arrives, so the server's
  // copy is what renders until there is something newer to show.
  const [remoteTasks, setRemoteTasks] = useState<TaskRow[] | null>(null)
  const [remoteMembers, setRemoteMembers] = useState<unknown[] | null>(null)
  const appliedMembersAt = useRef(0)
  // Publish time of the applied list, so an out-of-order delivery cannot
  // reinstate an older one.
  const appliedTasksAt = useRef(0)
  // Feed entries that came with a task change, keyed by their real audit id —
  // so the server's copy of the same row replaces rather than duplicates it.
  const [remoteActivity, setRemoteActivity] = useState<Map<string, ActivityEntry>>(
    () => new Map()
  )

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Held in a ref and kept out of the subscription effect's dependencies. As a
  // dependency it tore the whole Ably connection down and rebuilt it whenever
  // the router object changed identity — and every rebuild calls
  // /api/ably/auth, so a refresh could feed straight back into another
  // invocation. usePipelineRealtime never had it in there for the same reason.
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  }, [router])

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

  /**
   * The single place a task change is applied, whoever produced it.
   *
   * The actor calls this with what their own action returned rather than
   * waiting for the echo, so their list settles the instant the action
   * resolves. Both routes go through the same ordering check, so a late
   * delivery cannot put an older list back.
   */
  /**
   * The single place a comment is applied, whoever produced it.
   *
   * The author calls this with what their own action returned rather than
   * waiting for an echo they deliberately skip, so their thread settles the
   * instant the action resolves.
   */
  const applyComment = useCallback(
    (comment: FlatComment | null | undefined, actor?: { userId: string; name: string | null }) => {
      if (!comment) return
      setRemoteComments((prev) => {
        const next = new Map(prev)
        next.set(comment.id, {
          actorUserId: actor?.userId ?? comment.authorId ?? '',
          actorName: actor?.name ?? null,
          comment: {
            ...comment,
            createdAt: new Date(comment.createdAt),
            editedAt: comment.editedAt ? new Date(comment.editedAt) : null,
          },
        })
        return next
      })
    },
    []
  )

  /**
   * The roster, from the actor's own action result or off the channel.
   *
   * The one case that needs more than a repaint is the person just removed:
   * they are looking at a project they can no longer open, so they refetch and
   * let the server decide what they see. Everyone else stays put, which is the
   * whole point — a refresh for all viewers is what this replaced.
   */
  const applyMembers = useCallback(
    (payload: ApplicableMemberChange | undefined | null) => {
      if (!payload || payload.at <= appliedMembersAt.current) return
      appliedMembersAt.current = payload.at
      setRemoteMembers(payload.members)

      if (userId && payload.memberIds && !payload.memberIds.includes(userId)) {
        routerRef.current.refresh()
      }
    },
    [userId]
  )

  const applyTaskChange = useCallback((payload: ApplicableTaskChange | undefined | null) => {
    if (!payload || payload.at <= appliedTasksAt.current) return
    appliedTasksAt.current = payload.at

    setRemoteTasks(reviveTasks(payload.tasks))

    const activity = payload.activity as ActivityEntry | undefined | null
    if (!activity) return
    setRemoteActivity((prev) => {
      const next = new Map(prev)
      next.set(activity.id, { ...activity, createdAt: new Date(activity.createdAt) })
      return next
    })
  }, [])

  // Held in a ref so the subscription effect does not depend on it.
  const applyTaskChangeRef = useRef(applyTaskChange)
  useEffect(() => {
    applyTaskChangeRef.current = applyTaskChange
  }, [applyTaskChange])

  const applyMembersRef = useRef(applyMembers)
  useEffect(() => {
    applyMembersRef.current = applyMembers
  }, [applyMembers])

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
            timerRef.current = setTimeout(() => routerRef.current.refresh(), REFRESH_DEBOUNCE_MS)
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

        channel
          .subscribe(COLLAB_EVENT.tasks, (message: InboundMessage) => {
            applyTaskChangeRef.current(message.data as CollabTasksPayload | undefined)
          })
          ?.catch(() => {})

        channel
          .subscribe(COLLAB_EVENT.members, (message: InboundMessage) => {
            const payload = message.data as CollabMembersPayload | undefined
            if (!payload || payload.actorUserId === userId) return
            applyMembersRef.current(payload)
          })
          ?.catch(() => {})

        const viewerFrom = (m: PresenceMessage): PresenceViewer => ({
          clientId: m.clientId!,
          name: m.data?.name ?? 'Someone',
          imageUrl: m.data?.imageUrl ?? null,
        })

        // Applied from the event itself rather than re-fetching the whole set.
        // presence.get() on every enter and leave meant one person opening the
        // page cost every other viewer a round trip, so a room of ten paid a
        // hundred for ten arrivals.
        const upsertViewer = (m: PresenceMessage) => {
          if (!m.clientId || m.clientId === userId) return
          setViewers((prev) => {
            const index = prev.findIndex((v) => v.clientId === m.clientId)
            if (index === -1) return [...prev, viewerFrom(m)]
            // Replaced in place, so a name resolving late does not reshuffle
            // the row of avatars.
            const next = [...prev]
            next[index] = viewerFrom(m)
            return next
          })
        }

        const removeViewer = (m: PresenceMessage) => {
          if (!m.clientId) return
          setViewers((prev) => prev.filter((v) => v.clientId !== m.clientId))
        }

        // One authoritative read, after subscribing: anything that happens in
        // between is applied by the handlers above and then confirmed by this.
        const seedPresence = async () => {
          try {
            const members: PresenceMessage[] = (await channel?.presence.get()) ?? []
            if (cancelled) return
            const unique = new Map<string, PresenceViewer>()
            for (const m of members) {
              // Keyed by clientId, so one person in three tabs shows once.
              if (m.clientId && m.clientId !== userId) unique.set(m.clientId, viewerFrom(m))
            }
            setViewers([...unique.values()])
          } catch {
            // Presence is decorative; a failure must not break the page.
          }
        }

        channel.presence.subscribe(['enter', 'update'], upsertViewer)?.catch(() => {})
        channel.presence.subscribe('leave', removeViewer)?.catch(() => {})
        channel.presence.enter(identityRef.current).then(seedPresence).catch(() => {})
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
  }, [orgId, userId, projectId])

  return {
    viewers,
    remoteComments,
    remoteTasks,
    remoteActivity,
    remoteMembers,
    applyTaskChange,
    applyComment,
    applyMembers,
  }
}

/** JSON has no Date, so the fields the panel formats have to be rebuilt. */
function reviveTasks(rows: unknown[]): TaskRow[] {
  return (rows as TaskRow[]).map((task) => ({
    ...task,
    createdAt: new Date(task.createdAt),
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
  }))
}
