'use client'

import { PresenceAvatars } from '@/components/PresenceAvatars'
import { useCollabPresence } from './CollabRealtimeProvider'

/** Who else is on this project, from the page's single realtime connection. */
export function CollabPresence() {
  const { viewers } = useCollabPresence()
  return <PresenceAvatars viewers={viewers} />
}
