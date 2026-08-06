'use client'

import { useMemo, useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Activity } from 'lucide-react'
import { toast } from 'sonner'
import { getProjectActivity, type ActivityEntry } from '../actions/activity'
import { Panel, PanelEmpty, PANEL_SCROLL_SIDE } from './Panel'
import { useCollabRealtimeContext } from './CollabRealtimeProvider'
import type { RemoteCommentEvent } from '../hooks/useCollabRealtime'

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
      // Only says whose task it was when that is someone other than the person
      // who finished it — the action writes the id only in that case.
      return meta.completedForName
        ? `completed ${title}, assigned to ${meta.completedForName}`
        : `completed ${title}`
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

/** Identifies the audit row a wire comment will eventually produce. */
function commentKey(action: string, commentId: unknown): string | null {
  return typeof commentId === 'string' ? `${action}:${commentId}` : null
}

/**
 * The activity line a comment would have produced server-side.
 *
 * Which action it maps to is inferred from the comment itself, in the same
 * order the server decides it: a blanked comment was deleted, one with an
 * editedAt was edited, and otherwise it is new — a reply if it has a parent.
 */
function toActivityEntry(
  { comment, actorUserId, actorName }: RemoteCommentEvent,
  projectId: string
): ActivityEntry {
  const action = comment.isDeleted
    ? 'COMMENT_DELETED'
    : comment.editedAt
      ? 'COMMENT_EDITED'
      : comment.parentId
        ? 'COMMENT_REPLIED'
        : 'COMMENT_POSTED'

  return {
    // Prefixed so it cannot collide with a real audit row id.
    id: `local:${action}:${comment.id}`,
    action,
    entityType: 'Project',
    entityId: projectId,
    actorUserId,
    actorName,
    metadata: { commentId: comment.id },
    createdAt: comment.editedAt ?? comment.createdAt,
  }
}

/**
 * The feed as rendered: the server's head, older pages beneath it, and lines
 * for comments that arrived over the wire before their audit row did.
 *
 * Exported for its own test. The dedupe and the ordering are the parts that go
 * wrong, and they are not reachable through the component without a DOM.
 */
export function mergeActivity(
  initialEntries: ActivityEntry[],
  older: ActivityEntry[],
  remoteComments: Iterable<RemoteCommentEvent>,
  projectId: string
): ActivityEntry[] {
  const seen = new Set(initialEntries.map((e) => e.id))
  const merged = [...initialEntries, ...older.filter((e) => !seen.has(e.id))]

  // Comments arrive with their payload rather than as a nudge to refetch, so
  // the server's row for them may not exist here yet. Synthesize the line from
  // what came over the wire, and drop it once the real row shows up.
  const known = new Set(
    merged
      .map((e) => commentKey(e.action, e.metadata?.commentId))
      .filter((k): k is string => k !== null)
  )

  const synthetic = [...remoteComments]
    .map((event) => toActivityEntry(event, projectId))
    .filter((e) => !known.has(commentKey(e.action, e.metadata.commentId)!))

  // Stable sort, so entries sharing a timestamp keep the server's ordering.
  return [...merged, ...synthetic].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
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
  //
  // Older pages are held apart from initialEntries rather than copied into one
  // state. Seeding state from the prop froze the feed at mount: a refresh
  // handed down fresh entries and useState ignored them, so nothing ever
  // appeared without a full reload — not even your own actions.
  const [older, setOlder] = useState<ActivityEntry[]>([])
  const [pagedCursor, setPagedCursor] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Until someone pages back, follow the server's cursor so it stays correct as
  // the head grows. After that our own is the one that matches what we hold.
  const cursor = older.length > 0 ? pagedCursor : initialCursor

  const { remoteComments } = useCollabRealtimeContext()

  const entries = useMemo(
    () => mergeActivity(initialEntries, older, remoteComments.values(), projectId),
    [initialEntries, older, remoteComments, projectId]
  )

  function loadMore() {
    if (!cursor) return
    startTransition(async () => {
      try {
        const page = await getProjectActivity(projectId, { cursor })
        // Guard against a double-click racing two requests for the same cursor.
        setOlder((current) => {
          const seen = new Set(current.map((e) => e.id))
          return [...current, ...page.entries.filter((e) => !seen.has(e.id))]
        })
        setPagedCursor(page.nextCursor)
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
