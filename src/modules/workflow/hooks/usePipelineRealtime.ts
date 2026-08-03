'use client'

import { useEffect, useRef, useState } from 'react'
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
  pipelineChannel,
  PIPELINE_EVENT,
  type ProjectsMovedPayload,
} from '@/lib/ably/channels'

export type BoardViewer = {
  clientId: string
  name: string
  imageUrl?: string | null
}

/**
 * Live pipeline board: remote stage/order changes and presence.
 *
 * Ably is imported dynamically so it never runs during SSR, matching the
 * pattern already used by AblyProvider and GuestChatUI. The connection here is
 * separate from AblyProvider because that provider is mounted only under
 * /dashboard/messages.
 */
export function usePipelineRealtime({
  enabled,
  onRemoteMove,
}: {
  enabled: boolean
  onRemoteMove: (updates: ProjectsMovedPayload['updates']) => void
}) {
  const { orgId, userId } = useAuth()
  const { user } = useUser()
  const [viewers, setViewers] = useState<BoardViewer[]>([])

  // Held in a ref so the subscription effect does not tear down and resubscribe
  // every time the parent re-renders with a new closure. Assigned in an effect,
  // not during render, since a ref must not be mutated while rendering.
  const onRemoteMoveRef = useRef(onRemoteMove)
  useEffect(() => {
    onRemoteMoveRef.current = onRemoteMove
  }, [onRemoteMove])

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Someone'
  const imageUrl = user?.imageUrl ?? null

  useEffect(() => {
    if (!enabled || !orgId || !userId) return

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

        channel = client.channels.get(pipelineChannel(orgId))

        channel.subscribe(PIPELINE_EVENT.projectsMoved, (message: InboundMessage) => {
          const payload = message.data as ProjectsMovedPayload
          // Skip the echo of our own move; the optimistic update already applied
          // it, and re-applying would fight an in-flight drag.
          if (!payload || payload.actorUserId === userId) return
          onRemoteMoveRef.current(payload.updates)
        })

        const syncPresence = async () => {
          try {
            const members: PresenceMessage[] = (await channel?.presence.get()) ?? []
            if (cancelled) return
            const unique = new Map<string, BoardViewer>()
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
            // Presence is decorative; a failure must not break the board.
          }
        }

        channel.presence.subscribe(['enter', 'leave', 'update'], syncPresence)
        channel.presence.enter({ name: displayName, imageUrl }).then(syncPresence).catch(() => {})
      })
      .catch((err) => console.error('Failed to load Ably for pipeline:', err))

    return () => {
      cancelled = true
      try {
        channel?.presence?.leave()
        channel?.unsubscribe()
      } catch {
        // Connection may already be closing.
      }
      client?.close()
    }
  }, [enabled, orgId, userId, displayName, imageUrl])

  return { viewers }
}
