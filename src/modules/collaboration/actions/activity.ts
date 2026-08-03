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

/**
 * Project activity, newest first.
 *
 * Reads AuditLog rather than a dedicated events table — it is already
 * polymorphic and is what the rest of the app writes to. Rows about the project
 * itself and rows about its tasks are both included, which is why the task
 * writes carry `projectId` in their metadata.
 */
export async function getProjectActivity(
  projectId: string,
  limit = 30
): Promise<ActivityEntry[]> {
  const { orgId } = await authorizeEntityAccess('Project', projectId, 'read')

  const taskIds = await prisma.task.findMany({
    where: { businessId: orgId, projectId },
    select: { id: true },
  })

  const rows = await prisma.auditLog.findMany({
    where: {
      businessId: orgId,
      OR: [
        { entityType: 'Project', entityId: projectId },
        ...(taskIds.length
          ? [{ entityType: 'Task', entityId: { in: taskIds.map((t) => t.id) } }]
          : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  // Actor names are resolved in one query. actorUserId is intentionally not
  // FK-constrained (audit rows outlive users), so a missing user is expected
  // rather than an error.
  type ActorRow = {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }

  const actorIds = [...new Set(rows.map((r) => r.actorUserId).filter(Boolean))] as string[]
  const actors: ActorRow[] = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : []
  const actorById = new Map(actors.map((a) => [a.id, a]))

  return rows.map((row) => {
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
      metadata: safeParse(row.metadataJson),
      createdAt: row.createdAt,
    }
  })
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
