'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { authorizeConversationRead } from '@/modules/messaging/auth'
import { authorizeEntityAccess } from '@/modules/collaboration/authz'
import {
  emojiSetOf,
  groupReactions,
  isReactionTarget,
  type ReactionGroup,
  type ReactionTarget,
} from './reactions'

/**
 * Confirms the caller may see the thing they are reacting to.
 *
 * Reacting is a read-level act — anyone who can see a message can acknowledge
 * it — but it routes through the same authorizer as reading, so a reaction can
 * never reach a conversation or project the caller could not open. Returns the
 * project id for a comment, which is what the realtime channel is keyed on.
 */
async function authorizeTarget(targetType: ReactionTarget, targetId: string) {
  if (targetType === 'Message') {
    const { orgId } = await auth()
    if (!orgId) throw new Error('Unauthorized')

    const message = await prisma.message.findFirst({
      where: { id: targetId, conversation: { businessId: orgId } },
      select: { conversationId: true },
    })
    if (!message) throw new Error('Message not found')

    const ctx = await authorizeConversationRead(message.conversationId)
    return { userId: ctx.userId, orgId: ctx.orgId, conversationId: message.conversationId, projectId: null }
  }

  const comment = await prisma.comment.findFirst({
    where: { id: targetId },
    select: { entityType: true, entityId: true, businessId: true },
  })
  if (!comment) throw new Error('Comment not found')

  const ctx = await authorizeEntityAccess(comment.entityType, comment.entityId, 'read')
  return {
    userId: ctx.userId,
    orgId: ctx.orgId,
    conversationId: null,
    projectId: comment.entityType === 'Project' ? comment.entityId : null,
  }
}

/**
 * Adds or removes one emoji from the caller on one target.
 *
 * Idempotent by construction: the unique index means a repeat add is a no-op
 * rather than a duplicate, and the toggle is decided by whether the row exists
 * rather than by anything the client sends.
 *
 * Returns the target's full group list so the caller can apply the result
 * without refetching the thread — the same reason task mutations return theirs.
 */
export async function toggleReaction(
  targetType: string,
  targetId: string,
  emoji: string
): Promise<ReactionGroup[]> {
  if (!isReactionTarget(targetType)) {
    throw new Error('Unsupported reaction target')
  }
  if (typeof targetId !== 'string' || !targetId || targetId.length > 100) {
    throw new Error('Invalid target')
  }
  if (typeof emoji !== 'string' || !emoji.trim()) {
    throw new Error('Invalid reaction')
  }

  const { userId, orgId } = await authorizeTarget(targetType, targetId)

  // Only what the organisation offers. Without this the emoji field is a free
  // text column any client could write anything into, and the bar would render
  // whatever arrived.
  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { reactionEmojis: true },
  })
  if (!emojiSetOf(business).includes(emoji)) {
    throw new Error('That reaction is not enabled for this workspace')
  }

  const existing = await prisma.reaction.findUnique({
    where: {
      targetType_targetId_userId_emoji: { targetType, targetId, userId, emoji },
    },
    select: { id: true },
  })

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } })
  } else {
    await prisma.reaction.create({
      data: { businessId: orgId, userId, emoji, targetType, targetId },
    })
  }

  return readReactionsFor(targetType, targetId, userId, emojiSetOf(business))
}

/** The groups for a single target, after a change. */
async function readReactionsFor(
  targetType: ReactionTarget,
  targetId: string,
  viewerId: string,
  emojiOrder: string[]
): Promise<ReactionGroup[]> {
  const rows = await prisma.reaction.findMany({
    where: { targetType, targetId },
    select: { targetId: true, emoji: true, userId: true },
  })
  return groupReactions(rows, viewerId, emojiOrder).get(targetId) ?? []
}

/**
 * The reaction set this workspace offers, for rendering the picker.
 *
 * Read on its own rather than threaded through every list query, so the two
 * surfaces do not each have to grow a parameter for it.
 */
export async function getReactionEmojis(): Promise<string[]> {
  const { orgId } = await auth()
  if (!orgId) return emojiSetOf(null)

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { reactionEmojis: true },
  })
  return emojiSetOf(business)
}
