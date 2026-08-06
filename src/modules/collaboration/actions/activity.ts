'use server'

import prisma from '@/modules/core/db/prisma'
import { authorizeEntityAccess } from '../authz'
import { enrichActivityRows } from '../activity-entries'

export type ActivityEntry = {
  id: string
  action: string
  entityType: string
  entityId: string
  actorUserId: string | null
  actorName: string | null
  metadata: Record<string, unknown>
  createdAt: Date
}

// Not exported: a 'use server' module may only export async functions, and a
// stray const here fails the build rather than typecheck.
const ACTIVITY_PAGE_SIZE = 20

export type ActivityPage = {
  entries: ActivityEntry[]
  /** Pass back to fetch the next page; null when the log is exhausted. */
  nextCursor: string | null
}

/**
 * One page of project activity, newest first.
 *
 * Reads AuditLog rather than a dedicated events table — it is already
 * polymorphic and is what the rest of the app writes to. Rows about the project
 * itself and rows about its tasks are both included, which is why the task
 * writes carry `projectId` in their metadata.
 *
 * Paged rather than fetched whole: a long-running project accumulates hundreds
 * of entries, and loading them all made the page's first render carry the
 * entire history plus a name lookup for every row it referenced.
 *
 * Cursor-based, not offset-based. New entries land at the head of this ordering,
 * so an offset would shift under the reader and silently duplicate or skip rows
 * while they page through.
 */
export async function getProjectActivity(
  projectId: string,
  options: { cursor?: string | null; limit?: number } = {}
): Promise<ActivityPage> {
  const { orgId } = await authorizeEntityAccess('Project', projectId, 'read')
  const limit = options.limit ?? ACTIVITY_PAGE_SIZE

  const rows = await prisma.auditLog.findMany({
    where: {
      businessId: orgId,
      OR: [
        { entityType: 'Project', entityId: projectId },
        // Task rows are matched on the projectId inside their metadata rather
        // than by joining against existing tasks. Resolving task ids first meant
        // deleting a task erased its whole history from the log — the id no
        // longer resolved, so every row about it disappeared. A log has to
        // outlive the thing it describes, which is also why AuditLog has no
        // foreign key to Task.
        { entityType: 'Task', metadataJson: { contains: `"projectId":"${projectId}"` } },
      ],
    },
    // id breaks ties so the ordering is total; two rows written in the same
    // transaction share a timestamp, and an unstable order would make the cursor
    // skip one of them.
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    // One extra row is a cheaper "is there more?" than a second count query.
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  })

  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows

  const entries = await enrichActivityRows(pageRows)

  return {
    entries,
    nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
  }
}

