'use server'

import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/modules/notifications/services'
import { parseMentions, stripMentionMarkup } from '../mentions'
import { mentionableUserIds, mentionableUsersForProject } from '../mentionable'
import { authorizeEntityAccess, requireSession } from '../authz'

const MAX_BODY_LENGTH = 5000

export type CommentAuthor = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  imageUrl: string | null
}

export type CommentNode = {
  id: string
  body: string
  authorId: string | null
  author: CommentAuthor | null
  createdAt: Date
  editedAt: Date | null
  isDeleted: boolean
  replies: CommentNode[]
}

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  imageUrl: true,
} as const

/**
 * Threaded comments for an entity, newest thread last.
 *
 * Soft-deleted comments are returned with their body blanked rather than
 * omitted, so replies underneath them keep their context instead of appearing
 * to be top-level.
 */
export async function getComments(
  entityType: string,
  entityId: string
): Promise<CommentNode[]> {
  const { orgId } = await authorizeEntityAccess(entityType, entityId, 'read')

  const rows = await prisma.comment.findMany({
    where: { businessId: orgId, entityType, entityId },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: authorSelect } },
  })

  const toNode = (row: (typeof rows)[number]): CommentNode => ({
    id: row.id,
    body: row.deletedAt ? '' : row.body,
    authorId: row.deletedAt ? null : row.authorId,
    author: row.deletedAt ? null : row.author,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    isDeleted: !!row.deletedAt,
    replies: [],
  })

  const byId = new Map<string, CommentNode>()
  const roots: CommentNode[] = []

  for (const row of rows) {
    byId.set(row.id, toNode(row))
  }
  for (const row of rows) {
    const node = byId.get(row.id)!
    const parent = row.parentId ? byId.get(row.parentId) : null
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }

  return roots
}

/**
 * Posts a comment and fans out notifications to anyone @mentioned.
 *
 * Mentioned users are filtered against BusinessMembership: a body can name any
 * id, and without that check a caller could notify users outside the tenant.
 */
export async function createComment(input: {
  entityType: string
  entityId: string
  body: string
  parentId?: string | null
}) {
  const { userId, orgId } = await authorizeEntityAccess(input.entityType, input.entityId, 'write')

  const body = input.body.trim()
  if (!body) throw new Error('Comment cannot be empty.')
  if (body.length > MAX_BODY_LENGTH) {
    throw new Error(`Comment cannot exceed ${MAX_BODY_LENGTH} characters.`)
  }

  // A reply must belong to the same entity, or a comment could be grafted onto
  // a thread the caller cannot see.
  if (input.parentId) {
    const parent = await prisma.comment.findFirst({
      where: {
        id: input.parentId,
        businessId: orgId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
      select: { id: true, parentId: true },
    })
    if (!parent) throw new Error('Parent comment not found.')
    // Threads are one level deep; replying to a reply attaches to its root.
    if (parent.parentId) input.parentId = parent.parentId
  }

  // A body can name any id, so mentions are filtered to people who can actually
  // reach this project — its members plus admins. Anyone else would be notified
  // about, and linked to, a project they would be denied on arrival.
  const validMentionIds = await resolveMentionIds(orgId, input.entityType, input.entityId, body)

  // Notifying yourself is noise.
  const notifyIds = validMentionIds.filter((id) => id !== userId)

  const comment = await prisma.comment.create({
    data: {
      businessId: orgId,
      entityType: input.entityType,
      entityId: input.entityId,
      authorId: userId,
      body,
      parentId: input.parentId ?? null,
      mentions: {
        create: validMentionIds.map((mentionedUserId) => ({ mentionedUserId })),
      },
    },
  })

  await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.parentId ? 'COMMENT_REPLIED' : 'COMMENT_POSTED',
      actorUserId: userId,
      metadataJson: JSON.stringify({ commentId: comment.id, mentioned: validMentionIds.length }),
    },
  })

  if (notifyIds.length) {
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    })
    const actorName =
      [actor?.firstName, actor?.lastName].filter(Boolean).join(' ') ||
      actor?.email.split('@')[0] ||
      'Someone'

    const preview = stripMentionMarkup(body)
    const message = preview.length > 140 ? `${preview.slice(0, 137)}...` : preview

    await Promise.all(
      notifyIds.map((mentionedUserId) =>
        createNotification({
          businessId: orgId,
          userId: mentionedUserId,
          title: `${actorName} mentioned you`,
          message,
          type: 'mention',
          actionUrl: entityUrl(input.entityType, input.entityId),
        })
      )
    )
  }

  revalidatePath(entityUrl(input.entityType, input.entityId))
  return comment.id
}

/** Only the author may edit their own comment; admins included cannot rewrite it. */
export async function editComment(commentId: string, body: string) {
  const { userId, orgId } = await requireSession()

  const existing = await prisma.comment.findFirst({
    where: { id: commentId, businessId: orgId },
  })
  if (!existing) throw new Error('Comment not found.')
  if (existing.deletedAt) throw new Error('Cannot edit a deleted comment.')
  if (existing.authorId !== userId) {
    throw new Error('Forbidden: You can only edit your own comments.')
  }

  const trimmed = body.trim()
  if (!trimmed) throw new Error('Comment cannot be empty.')
  if (trimmed.length > MAX_BODY_LENGTH) {
    throw new Error(`Comment cannot exceed ${MAX_BODY_LENGTH} characters.`)
  }

  // Re-check the caller still has write access to the underlying entity.
  await authorizeEntityAccess(existing.entityType, existing.entityId, 'write')

  const validMentionIds = await resolveMentionIds(
    orgId,
    existing.entityType,
    existing.entityId,
    trimmed
  )

  // Replace the mention set so removing a name also removes their badge.
  await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: { body: trimmed, editedAt: new Date() },
    }),
    prisma.mention.deleteMany({ where: { commentId } }),
    ...(validMentionIds.length
      ? [
          prisma.mention.createMany({
            data: validMentionIds.map((mentionedUserId) => ({ commentId, mentionedUserId })),
          }),
        ]
      : []),
  ])

  await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: existing.entityType,
      entityId: existing.entityId,
      action: 'COMMENT_EDITED',
      actorUserId: userId,
      metadataJson: JSON.stringify({ commentId }),
    },
  })

  revalidatePath(entityUrl(existing.entityType, existing.entityId))
}

/**
 * Soft delete. The row is kept so replies underneath it survive — the schema's
 * onDelete: Cascade on parentId would otherwise take the whole thread.
 */
export async function deleteComment(commentId: string) {
  const { userId, orgId } = await requireSession()

  const existing = await prisma.comment.findFirst({
    where: { id: commentId, businessId: orgId },
  })
  if (!existing) throw new Error('Comment not found.')
  if (existing.deletedAt) return

  const { isAdmin } = await authorizeEntityAccess(existing.entityType, existing.entityId, 'read')

  // Authors can remove their own; admins can moderate anyone's.
  if (existing.authorId !== userId && !isAdmin) {
    throw new Error('Forbidden: You can only delete your own comments.')
  }

  await prisma.$transaction([
    prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    }),
    // Drop mentions so a deleted comment stops showing in anyone's unread list.
    prisma.mention.deleteMany({ where: { commentId } }),
    prisma.auditLog.create({
      data: {
        businessId: orgId,
        entityType: existing.entityType,
        entityId: existing.entityId,
        action: 'COMMENT_DELETED',
        actorUserId: userId,
        metadataJson: JSON.stringify({ commentId }),
      },
    }),
  ])

  revalidatePath(entityUrl(existing.entityType, existing.entityId))
}

/**
 * People who can be @mentioned on a project: its members plus admins.
 *
 * Scoped to the project rather than the business so the picker cannot offer
 * someone the mention would then be dropped for.
 */
export async function getMentionableUsers(projectId: string) {
  const { orgId } = await authorizeEntityAccess('Project', projectId, 'read')
  return mentionableUsersForProject(orgId, projectId)
}

/**
 * Mention ids in `body` that are allowed on this entity, in body order.
 *
 * Returns nothing for an entity type with no rule rather than falling back to
 * "any business member" — a new commentable type should have to opt in.
 */
async function resolveMentionIds(
  orgId: string,
  entityType: string,
  entityId: string,
  body: string
): Promise<string[]> {
  const mentioned = parseMentions(body)
  if (!mentioned.length) return []

  if (entityType !== 'Project') return []

  const allowed = await mentionableUserIds(orgId, entityId)
  return mentioned.map((m) => m.userId).filter((id) => allowed.has(id))
}

function entityUrl(entityType: string, entityId: string) {
  switch (entityType) {
    case 'Project':
      return `/dashboard/projects/${entityId}`
    default:
      return '/dashboard'
  }
}
