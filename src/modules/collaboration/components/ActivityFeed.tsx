'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'
import type { ActivityEntry } from '../actions/activity'

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

const COLLAPSED_COUNT = 15

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  // The log keeps everything; the panel just starts collapsed so a long-running
  // project does not bury the rest of the page.
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? entries : entries.slice(0, COLLAPSED_COUNT)
  const hidden = entries.length - shown.length

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
        <Activity className="h-4 w-4 text-zinc-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Activity</h3>
        {entries.length > 0 && (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {entries.length}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Nothing has happened on this project yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {shown.map((entry) => (
            <li key={entry.id} className="flex items-baseline gap-2 px-4 py-2.5 text-sm">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {entry.actorName ?? 'Someone'}
              </span>
              <span className="min-w-0 flex-1 text-zinc-600 dark:text-zinc-400">
                {describe(entry)}
              </span>
              <span className="shrink-0 text-xs text-zinc-400">
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
              </span>
            </li>
          ))}
          {hidden > 0 && (
            <li className="px-4 py-2.5 text-center">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                Show {hidden} earlier {hidden === 1 ? 'entry' : 'entries'}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
