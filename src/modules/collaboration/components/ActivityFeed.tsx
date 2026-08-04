'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'
import { toast } from 'sonner'
import { getProjectActivity, type ActivityEntry } from '../actions/activity'
import { Panel, PanelEmpty, PANEL_SCROLL_SIDE } from './Panel'

/**
 * Turns an audit row into a sentence.
 *
 * Falls back to a humanized action string for any action this component has not
 * been taught, so a new audit event shows up as readable text rather than
 * vanishing from the feed.
 */
function describe(entry: ActivityEntry): string {
  const meta = entry.metadata as Record<string, string | undefined>
  const title = typeof meta.title === 'string' ? `"${meta.title}"` : 'a task'
  const who = meta.subjectName ?? 'someone'

  switch (entry.action) {
    // Tasks
    case 'TASK_CREATED':
      return `added ${title}`
    case 'TASK_DELETED':
      return `deleted ${title}`
    case 'TASK_COMPLETED':
      return `completed ${title}`
    case 'TASK_STATUS_CHANGED':
      return `moved ${title} to ${humanize(meta.to ?? '')}`
    case 'TASK_ASSIGNEE_CHANGED':
      return meta.to ? `assigned ${title} to ${who}` : `unassigned ${title}`

    // Discussion
    case 'COMMENT_POSTED':
      return 'posted a comment'
    case 'COMMENT_REPLIED':
      return 'replied in the discussion'
    case 'COMMENT_EDITED':
      return 'edited a comment'
    case 'COMMENT_DELETED':
      return 'deleted a comment'

    // Members
    case 'PROJECT_MEMBER_ADDED':
      return `added ${who} to the project`
    case 'PROJECT_MEMBER_REMOVED':
      return `removed ${who} from the project`
    case 'PROJECT_MEMBER_ROLE_CHANGED':
      return `changed ${who}'s role to ${humanize(meta.role ?? '')}`

    // Project
    case 'STAGE_CHANGED':
      return meta.fromStageName
        ? `moved this project from ${meta.fromStageName} to ${meta.toStageName ?? 'another stage'}`
        : `moved this project to ${meta.toStageName ?? 'another stage'}`
    case 'STAGE_CHANGED_TO_DELIVERED':
      return 'marked this project delivered'
    case 'ASSIGNEE_CHANGED':
      return 'changed the project lead'

    default:
      // An action this component has not been taught still shows as readable
      // text, so a new audit event never silently vanishes from the log.
      return humanize(entry.action).toLowerCase()
  }
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
}

export function ActivityFeed({
  projectId,
  initialEntries,
  initialCursor,
  grow = false,
}: {
  projectId: string
  initialEntries: ActivityEntry[]
  initialCursor: string | null
  /** Fill the sidebar's leftover height so the card ends level with the column beside it. */
  grow?: boolean
}) {
  // Only the first page is rendered by the server; the rest is fetched on
  // demand, so opening a long-running project does not pay for its whole
  // history up front.
  const [entries, setEntries] = useState(initialEntries)
  const [cursor, setCursor] = useState(initialCursor)
  const [isPending, startTransition] = useTransition()

  function loadMore() {
    if (!cursor) return
    startTransition(async () => {
      try {
        const page = await getProjectActivity(projectId, { cursor })
        // Guard against a double-click racing two requests for the same cursor.
        setEntries((current) => {
          const seen = new Set(current.map((e) => e.id))
          return [...current, ...page.entries.filter((e) => !seen.has(e.id))]
        })
        setCursor(page.nextCursor)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load more activity')
      }
    })
  }

  return (
    <Panel
      icon={Activity}
      title="Activity"
      count={entries.length > 0 ? `${entries.length}${cursor ? '+' : ''}` : undefined}
      scrollClassName={PANEL_SCROLL_SIDE}
      grow={grow}
    >
      {entries.length === 0 ? (
        <PanelEmpty>Nothing has happened on this project yet.</PanelEmpty>
      ) : (
        // A timeline rather than a list of rows: the rail and dots make the
        // order of events legible without a divider between every entry.
        <ul className="space-y-3 px-4 py-4">
          {entries.map((entry) => (
            <li key={entry.id} className="group relative flex gap-3 pl-4">
              <span
                aria-hidden
                className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-zinc-300 ring-4 ring-white dark:bg-zinc-600 dark:ring-zinc-900"
              />
              {/* Rail between dots; hidden on the last entry so it does not
                  trail off the end of the timeline. */}
              <span
                aria-hidden
                className="absolute bottom-[-0.75rem] left-[2.5px] top-4 w-px bg-zinc-100 group-last:hidden dark:bg-zinc-800"
              />
              <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {entry.actorName ?? 'Someone'}
                </span>{' '}
                {describe(entry)}
                <span className="ml-1.5 whitespace-nowrap text-xs text-zinc-400">
                  {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                </span>
              </p>
            </li>
          ))}
          {cursor && (
            <li className="pl-4 pt-1">
              <button
                type="button"
                onClick={loadMore}
                disabled={isPending}
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-50 dark:hover:text-zinc-200"
              >
                {isPending ? 'Loading...' : 'Load earlier activity'}
              </button>
            </li>
          )}
        </ul>
      )}
    </Panel>
  )
}
