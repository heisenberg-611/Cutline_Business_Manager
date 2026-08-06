'use server'

import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/modules/notifications/services'
import { parseMentions, stripMentionMarkup } from '../mentions'
import { mentionableUserIds, mentionableUsersForProject } from '../mentionable'
import { authorizeEntityAccess, requireSession } from '../authz'
import { buildCommentTree, type CommentNode as TreeNode, type FlatComment } from '../comment-tree'
import { reconcileBusinessMembers } from '@/lib/clerk-members'
import { publishCollabComment } from '../realtime'

const MAX_BODY_LENGTH = 5000

export type { CommentAuthor, CommentNode } from '../comment-tree'

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
): Promise<TreeNode[]> {
  const { orgId } = await authorizeEntityAccess(entityType, entityId, 'read')

  const rows = await prisma.comment.findMany({
    where: { businessId: orgId, entityType, entityId },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: authorSelect } },
  })

  return buildCommentTree(rows.map(toFlatComment))
}

/**
 * A stored row as the thread renders it.
 *
 * Deleting removes what was said, not who said it: the thread still has to show
 * whose comment was withdrawn, and replies below it need that context. Blanking
 * here rather than in the client means the body never reaches a browser — which
 * matters now that comments travel over the realtime channel too.
 */
function toFlatComment(row: {
  id: string
  parentId: string | null
  body: string
  authorId: string | null
  author: CommentAuthorRow | null
  createdAt: Date
  editedAt: Date | null
  deletedAt: Date | null
}): FlatComment {
  return {
    id: row.id,
    parentId: row.parentId,
    body: row.deletedAt ? '' : row.body,
    authorId: row.authorId,
    author: row.author,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    isDeleted: !!row.deletedAt,
  }
}

type CommentAuthorRow = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  imageUrl: string | null
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
  let replyingTo: string | null = null
  if (input.parentId) {
    const parent = await prisma.comment.findFirst({
      where: {
        id: input.parentId,
        businessId: orgId,
        entityType: input.entityType,
        entityId: input.entityId,
      },
      select: { id: true, parentId: true, authorId: true, deletedAt: true },
    })
    if (!parent) throw new Error('Parent comment not found.')
    // The person being replied to. Taken from the comment actually replied to,
    // before the root re-parenting below, so replying to a reply notifies the
    // person who wrote that reply rather than whoever started the thread.
    if (!parent.deletedAt) replyingTo = parent.authorId
    // Threads are one level deep; replying to a reply attaches to its root.
    if (parent.parentId) input.parentId = parent.parentId
  }

  // A body can name any id, so mentions are filtered to people who can actually
  // reach this project — its members plus admins. Anyone else would be notified
  // about, and linked to, a project they would be denied on arrival.
  const validMentionIds = await resolveMentionIds(orgId, input.entityType, input.entityId, body)

  // Notifying yourself is noise.
  const notifyIds = validMentionIds.filter((id) => id !== userId)

  // A reply is addressed at someone, so tell them — otherwise a conversation
  // only works if the other person happens to reload the page. Skipped when
  // they are already being notified for a mention in the same comment, so one
  // comment never produces two notifications for one person, and held to the
  // same access rule as mentions so nobody is pointed at a project they cannot
  // open.
  if (
    replyingTo &&
    replyingTo !== userId &&
    !notifyIds.includes(replyingTo) &&
    (await canBeNotified(orgId, input.entityType, input.entityId, replyingTo))
  ) {
    notifyIds.push(replyingTo)
  }

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
      notifyIds.map((recipientId) =>
        createNotification({
          businessId: orgId,
          userId: recipientId,
          title:
            recipientId === replyingTo && !validMentionIds.includes(recipientId)
              ? `${actorName} replied to you`
              : `${actorName} mentioned you`,
          message,
          type: 'mention',
          actionUrl: entityUrl(input.entityType, input.entityId),
        })
      )
    )
  }

  revalidatePath(entityUrl(input.entityType, input.entityId))
  await publishComment(orgId, input.entityType, input.entityId, userId, comment.id)
  return comment.id
}


/**
 * Sends the comment itself to everyone else on the project.
 *
 * Only Project comments go out: the channel is per project, and the comment
 * table is polymorphic — an invoice thread has nowhere to publish to and should
 * not be broadcast to a project's viewers.
 */
async function publishComment(
  orgId: string,
  entityType: string,
  entityId: string,
  actorUserId: string,
  commentId: string
) {
  if (entityType !== 'Project') return
  // Checked before the read, not inside publish: with realtime off there is
  // nowhere to send it, and re-reading the row would be pure waste.
  if (!process.env.ABLY_API_KEY) return

  const row = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { author: { select: authorSelect } },
  })
  if (!row) return

  // Only the author may edit, so for posts and edits the actor is the author
  // and no extra lookup is needed. A delete can be an admin moderating, which
  // is the one case worth a query.
  const actorName =
    actorUserId === row.authorId
      ? nameOf(row.author)
      : nameOf(
          await prisma.user.findUnique({
            where: { id: actorUserId },
            select: { firstName: true, lastName: true, email: true },
          })
        )

  await publishCollabComment(orgId, entityId, actorUserId, actorName, toFlatComment(row))

}

/** Matches how the activity feed renders a name, so the two cannot disagree. */
function nameOf(
  user: { firstName: string | null; lastName: string | null; email: string } | null
) {
  if (!user) return null
  return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0]
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
  await publishComment(orgId, existing.entityType, existing.entityId, userId, commentId)
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
  // Carries the blanked body, so readers drop the text without a refetch.
  await publishComment(orgId, existing.entityType, existing.entityId, userId, commentId)
}

/**
 * People who can be @mentioned on a project: its members plus admins.
 *
 * Scoped to the project rather than the business so the picker cannot offer
 * someone the mention would then be dropped for.
 */
export async function getMentionableUsers(projectId: string) {
  const { orgId } = await authorizeEntityAccess('Project', projectId, 'read')
  // Only here, not in mentionableUsersForProject: that is also the server-side
  // validation path for every comment posted, which must not call Clerk.
  await reconcileBusinessMembers(orgId)
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

/** Whether someone may be pointed at this entity by a notification. */
async function canBeNotified(
  orgId: string,
  entityType: string,
  entityId: string,
  userId: string
): Promise<boolean> {
  if (entityType !== 'Project') return false
  const allowed = await mentionableUserIds(orgId, entityId)
  return allowed.has(userId)
}

function entityUrl(entityType: string, entityId: string) {
  switch (entityType) {
    case 'Project':
      return `/dashboard/projects/${entityId}`
    default:
      return '/dashboard'
  }
}
