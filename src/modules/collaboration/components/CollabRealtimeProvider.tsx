'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useCollabRealtime, type RemoteCommentEvent } from '../hooks/useCollabRealtime'
import type { PresenceViewer } from '@/components/PresenceAvatars'

type CollabRealtimeValue = {
  viewers: PresenceViewer[]
  remoteComments: Map<string, RemoteCommentEvent>
}

const EMPTY: CollabRealtimeValue = { viewers: [], remoteComments: new Map() }

const CollabRealtimeContext = createContext<CollabRealtimeValue>(EMPTY)

/**
 * One socket for the whole collaboration page.
 *
 * Presence belongs in the header and the comment stream belongs in the
 * discussion pane, which are different subtrees — running the hook in each
 * would open two connections and enter presence twice, showing one person as
 * two viewers. So it runs once here and both read from context.
 *
 * Wraps server-rendered children: they arrive as `children`, so putting a
 * client boundary here does not pull the page's data fetching into the browser.
 */
export function CollabRealtimeProvider({
  projectId,
  children,
}: {
  projectId: string
  children: ReactNode
}) {
  const value = useCollabRealtime(projectId)
  return (
    <CollabRealtimeContext.Provider value={value}>{children}</CollabRealtimeContext.Provider>
  )
}

/** Defaults to empty, so a consumer outside the provider renders rather than throws. */
export function useCollabRealtimeContext() {
  return useContext(CollabRealtimeContext)
}
