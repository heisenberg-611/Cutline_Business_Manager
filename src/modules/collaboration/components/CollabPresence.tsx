'use client'

import { PresenceAvatars } from '@/components/PresenceAvatars'
import { useCollabRealtimeContext } from './CollabRealtimeProvider'

/** Who else is on this project, from the page's single realtime connection. */
export function CollabPresence() {
  const { viewers } = useCollabRealtimeContext()
  return <PresenceAvatars viewers={viewers} />
}
