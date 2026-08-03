'use client'

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

  switch (entry.action) {
    case 'TASK_COMPLETED':
      return `completed ${title}`
    case 'TASK_STATUS_CHANGED':
      return `moved ${title} to ${humanize(meta.to ?? '')}`
    case 'TASK_ASSIGNEE_CHANGED':
      return meta.to ? `reassigned ${title}` : `unassigned ${title}`
    case 'STAGE_CHANGED_TO_DELIVERED':
      return 'marked this project delivered'
    case 'ASSIGNEE_CHANGED':
      return 'changed the project assignee'
    default:
      return humanize(entry.action).toLowerCase()
  }
}

function humanize(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase())
}

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
        <Activity className="h-4 w-4 text-zinc-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Activity</h3>
      </div>

      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Nothing has happened on this project yet.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {entries.map((entry) => (
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
        </ul>
      )}
    </div>
  )
}
