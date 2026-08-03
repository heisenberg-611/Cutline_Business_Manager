'use server'

import prisma from '@/modules/core/db/prisma'
import { authorizeEntityAccess } from '../authz'

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

  // Actor names are resolved in one query. actorUserId is intentionally not
  // FK-constrained (audit rows outlive users), so a missing user is expected
  // rather than an error.
  type ActorRow = {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }

  const actorIds = [...new Set(pageRows.map((r) => r.actorUserId).filter(Boolean))] as string[]
  const actors: ActorRow[] = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : []
  const actorById = new Map(actors.map((a) => [a.id, a]))

  const parsed = pageRows.map((row) => ({ row, metadata: safeParse(row.metadataJson) }))

  // Metadata stores ids. A log that reads "changed stage to wfs_abc123" is not a
  // log anyone can use, so referenced stages and people are resolved to names.
  const stageIds = new Set<string>()
  const subjectIds = new Set<string>()
  for (const { metadata } of parsed) {
    for (const key of ['fromStageId', 'toStageId']) {
      const value = metadata[key]
      if (typeof value === 'string') stageIds.add(value)
    }
    for (const key of ['userId', 'from', 'to']) {
      const value = metadata[key]
      // 'from'/'to' hold a status on task rows and a user id on assignee rows.
      if (typeof value === 'string' && value.startsWith('user_')) subjectIds.add(value)
    }
  }

  const [stages, subjects] = await Promise.all([
    stageIds.size
      ? prisma.workflowStage.findMany({
          where: { id: { in: [...stageIds] } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    subjectIds.size
      ? prisma.user.findMany({
          where: { id: { in: [...subjectIds] } },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : Promise.resolve([]),
  ])

  const stageName = new Map(stages.map((s) => [s.id, s.name]))
  const subjectName = new Map(
    subjects.map((u) => [
      u.id,
      [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email.split('@')[0],
    ])
  )

  const nameOf = (id: unknown) =>
    typeof id === 'string' ? (subjectName.get(id) ?? null) : null

  const entries = parsed.map(({ row, metadata }) => {
    const actor = row.actorUserId ? actorById.get(row.actorUserId) : null
    return {
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      actorUserId: row.actorUserId,
      actorName: actor
        ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') ||
          actor.email.split('@')[0]
        : null,
      metadata: {
        ...metadata,
        fromStageName: stageName.get(String(metadata.fromStageId)) ?? null,
        toStageName: stageName.get(String(metadata.toStageId)) ?? null,
        subjectName: nameOf(metadata.userId) ?? nameOf(metadata.to) ?? null,
      },
      createdAt: row.createdAt,
    }
  })

  return {
    entries,
    nextCursor: hasMore ? pageRows[pageRows.length - 1].id : null,
  }
}

/** Audit metadata is free-form text; a malformed row must not break the feed. */
function safeParse(json: string | null): Record<string, unknown> {
  if (!json) return {}
  try {
    const parsed = JSON.parse(json)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
