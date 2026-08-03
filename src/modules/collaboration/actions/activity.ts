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
  // The log is meant to be complete rather than a recent-items list, so this is
  // a safety ceiling, not a page size. The UI collapses it and offers "show all".
  limit = 300
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

  const parsed = rows.map((row) => ({ row, metadata: safeParse(row.metadataJson) }))

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

  return parsed.map(({ row, metadata }) => {
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
