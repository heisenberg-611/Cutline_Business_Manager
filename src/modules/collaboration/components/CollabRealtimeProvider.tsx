'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useCollabRealtime, type RemoteCommentEvent } from '../hooks/useCollabRealtime'
import type { PresenceViewer } from '@/components/PresenceAvatars'
import type { TaskRow } from '../actions/tasks'
import type { ActivityEntry } from '../actions/activity'

type CollabPresenceValue = {
  viewers: PresenceViewer[]
}

type CollabDataValue = {
  remoteComments: Map<string, RemoteCommentEvent>
  remoteTasks: TaskRow[] | null
  remoteActivity: Map<string, ActivityEntry>
}

const EMPTY_PRESENCE: CollabPresenceValue = { viewers: [] }
const EMPTY_DATA: CollabDataValue = {
  remoteComments: new Map(),
  remoteTasks: null,
  remoteActivity: new Map(),
}

/**
 * Two contexts, not one.
 *
 * They move on completely different schedules: viewers churn whenever anyone
 * opens or closes the page, while the data changes only when someone actually
 * edits something. Sharing a single value meant a teammate merely arriving
 * re-rendered the task list, the discussion and the activity feed.
 */
const CollabPresenceContext = createContext<CollabPresenceValue>(EMPTY_PRESENCE)
const CollabDataContext = createContext<CollabDataValue>(EMPTY_DATA)

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
  const { viewers, remoteComments, remoteTasks, remoteActivity } = useCollabRealtime(projectId)

  // Memoized, or each object literal would be a fresh identity on every render
  // of this provider and the split above would buy nothing.
  const presence = useMemo(() => ({ viewers }), [viewers])
  const data = useMemo(
    () => ({ remoteComments, remoteTasks, remoteActivity }),
    [remoteComments, remoteTasks, remoteActivity]
  )

  return (
    <CollabPresenceContext.Provider value={presence}>
      <CollabDataContext.Provider value={data}>{children}</CollabDataContext.Provider>
    </CollabPresenceContext.Provider>
  )
}

/** Who else is on the page. Defaults to empty outside the provider. */
export function useCollabPresence() {
  return useContext(CollabPresenceContext)
}

/** Tasks, comments and activity that arrived over the channel. */
export function useCollabRealtimeContext() {
  return useContext(CollabDataContext)
}
