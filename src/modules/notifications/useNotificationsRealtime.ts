'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
// Type-only: erased at compile time, so the SDK is not pulled into SSR.
import type {
  ErrorInfo,
  InboundMessage,
  Realtime,
  RealtimeChannel,
  TokenDetails,
  TokenRequest,
} from 'ably'
import {
  userNotificationsChannel,
  NOTIFICATION_EVENT,
  type NotificationPayload,
} from '@/lib/ably/channels'

/**
 * Tells the bell when something has arrived, instead of it asking.
 *
 * Polling cost one Vercel invocation per user per interval, almost always to
 * learn that nothing had changed. This holds a socket open instead and calls
 * `onNotification` when the server raises a signal.
 *
 * The signal carries no content: the callback refetches through the normal
 * authorized action, so nothing is trusted off the channel and the bell cannot
 * be made to display something the reader is not entitled to.
 */
export function useNotificationsRealtime(onNotification: () => void) {
  const { isSignedIn, orgId, userId } = useAuth()

  // Held in a ref so a new callback identity does not tear down the socket.
  const callbackRef = useRef(onNotification)
  useEffect(() => {
    callbackRef.current = onNotification
  }, [onNotification])

  useEffect(() => {
    if (!isSignedIn || !orgId || !userId) return

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

        channel = client.channels.get(userNotificationsChannel(userId))

        // subscribe() implicitly attaches and returns a promise; closing the
        // client mid-attach rejects it if left uncaught.
        channel
          .subscribe(NOTIFICATION_EVENT, (message: InboundMessage) => {
            const payload = message.data as NotificationPayload | undefined
            // A user can belong to several organizations, and the feed is per
            // user. Ignore anything for the org they are not currently in —
            // the bell only ever shows the active one.
            if (payload?.businessId && payload.businessId !== orgId) return
            callbackRef.current()
          })
          ?.catch(() => {})
      })
      .catch((err) => console.error('Failed to load Ably for notifications:', err))

    return () => {
      cancelled = true
      const closingChannel = channel
      const closingClient = client

      try {
        closingChannel?.unsubscribe()
      } catch {
        // Already detached.
      }
      try {
        closingClient?.close()
      } catch {
        // Already closing.
      }
    }
  }, [isSignedIn, orgId, userId])
}
