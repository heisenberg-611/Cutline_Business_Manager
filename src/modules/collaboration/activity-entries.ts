import prisma from '@/modules/core/db/prisma'
import type { ActivityEntry } from './actions/activity'

/**
 * Shaping audit rows into feed entries.
 *
 * A plain module, not 'use server'. These are called from the write path as
 * well as the read one, and every export of a 'use server' file becomes a
 * callable endpoint — an unauthenticated one here would answer "what is this
 * user id called?" for anyone who asked.
 */

export type AuditRowForFeed = {
  id: string
  action: string
  entityType: string
  entityId: string
  actorUserId: string | null
  metadataJson: string | null
  createdAt: Date
}

/**
 * Turns raw audit rows into feed entries: names resolved, metadata parsed.
 *
 * Extracted so a single row can be enriched on the write path too. Task
 * mutations publish the entry they just wrote over the realtime channel, and it
 * has to arrive shaped exactly as the paged read produces it or the same event
 * would render two different ways depending on how it reached the reader.
 */
export async function enrichActivityRows(rows: AuditRowForFeed[]): Promise<ActivityEntry[]> {
  if (rows.length === 0) return []

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
    for (const key of ['userId', 'from', 'to', 'completedForId']) {
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
        // Kept separate from subjectName: a completion row's `to` is a status,
        // so folding this into the same field would leave the sentence reading
        // "assigned to DONE".
        completedForName: nameOf(metadata.completedForId),
      },
      createdAt: row.createdAt,
    }
  })
}

/** Enriches exactly one row, for the realtime write path. */
export async function enrichActivityRow(row: AuditRowForFeed): Promise<ActivityEntry> {
  const [entry] = await enrichActivityRows([row])
  return entry
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
