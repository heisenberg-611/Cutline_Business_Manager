'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { authorizeConversationRead, authorizeConversationWrite } from '../auth'
import { checkMessageRateLimit } from '@/lib/utils/rate-limit'
import { createManyNotifications } from '@/modules/notifications/services'
import { requirePlan, getActivePlanFor } from '@/lib/plan-guard'
import { canUseMessages } from '@/lib/subscription'

/**
 * Gets or creates a DIRECT conversation between the current user and a target user.
 */
export async function getOrCreateDirectConversation(targetUserId: string) {
  if (typeof targetUserId !== 'string' || targetUserId.length > 100) {
    throw new Error('Invalid target user')
  }

  const { userId, orgId } = await auth()
  if (!userId || !orgId) throw new Error('Unauthorized')

  await requirePlan(orgId, 'messages')

  if (userId === targetUserId) {
    throw new Error('Cannot create a conversation with yourself')
  }

  // Verify target user is in the same business
  const targetMembership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId: orgId, userId: targetUserId } }
  })
  if (!targetMembership) {
    throw new Error('Target user is not in this business')
  }

  // Look for an existing DIRECT conversation with exactly these two participants
  const existingConversations = await prisma.conversation.findMany({
    where: {
      businessId: orgId,
      type: 'DIRECT',
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: targetUserId } } }
      ]
    },
    include: {
      participants: true
    }
  })

  // Filter to ensure it has exactly 2 participants
  const existing = existingConversations.find(c => c.participants.length === 2)
  if (existing) {
    const myParticipant = existing.participants.find(p => p.userId === userId)
    if (myParticipant?.deletedAt) {
      await prisma.conversationParticipant.update({
        where: { id: myParticipant.id },
        data: { deletedAt: null }
      })
    }
    return existing
  }

  // Create new DIRECT conversation
  const newConversation = await prisma.conversation.create({
    data: {
      businessId: orgId,
      type: 'DIRECT',
      createdBy: userId,
      participants: {
        create: [
          { userId },
          { userId: targetUserId }
        ]
      }
    },
    include: {
      participants: true
    }
  })

  return newConversation
}

/**
 * Updates the slow mode settings for a conversation (Admins only)
 */
export async function updateSlowMode(conversationId: string, enabled: boolean, cooldown: number) {
  const { userId, orgId, orgRole, conversation } = await authorizeConversationWrite(conversationId)
  
  const isAdmin = orgRole === 'org:admin'
  
  if (!isAdmin) {
    throw new Error('Only administrators can update slow mode settings')
  }

  await prisma.conversation.update({
    where: { id: conversationId, businessId: orgId },
    data: {
      slowModeEnabled: enabled,
      slowModeCooldown: cooldown
    }
  })
}

/**
 * Lists all conversations for the current user, ordered by most recent activity.
 */
export async function getConversations() {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) return []

  // Empty rather than thrown, matching how this read already handles a missing
  // session — and it must not fall through, because the next step creates a
  // BROADCAST conversation as a side effect.
  if (!canUseMessages(await getActivePlanFor(orgId))) return []

  // Ensure at least one BROADCAST conversation exists for the business
  const existingBroadcast = await prisma.conversation.findFirst({
    where: { businessId: orgId, type: 'BROADCAST' }
  })

  if (!existingBroadcast) {
    await prisma.conversation.create({
      data: {
        businessId: orgId,
        type: 'BROADCAST',
        createdBy: userId,
      }
    })
  }

  // Auto-join any broadcasts that the user isn't part of yet
  const unjoinedBroadcasts = await prisma.conversation.findMany({
    where: {
      businessId: orgId,
      type: 'BROADCAST',
      NOT: {
        participants: {
          some: { userId }
        }
      }
    }
  })

  if (unjoinedBroadcasts.length > 0) {
    await prisma.conversationParticipant.createMany({
      data: unjoinedBroadcasts.map(b => ({
        conversationId: b.id,
        userId: userId,
      })),
      skipDuplicates: true
    })
  }

  const participants = await prisma.conversationParticipant.findMany({
    where: {
      userId,
      conversation: { businessId: orgId }
    },
    include: {
      conversation: {
        include: {
          participants: {
            select: {
              userId: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          // Get the very latest message to use for sorting & preview
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }
    }
  })

  // Sort by the latest message time, or conversation creation time if no messages
  return participants.map(p => {
    const latestMessage = p.conversation.messages[0]
    const lastActivity = latestMessage ? latestMessage.createdAt : p.conversation.createdAt
    return {
      ...p.conversation,
      unreadCount: calculateUnreadCount(p.lastReadAt, p.conversation.messages[0]),
      lastActivity,
      myParticipantRecord: {
        lastReadAt: p.lastReadAt,
        joinedAt: p.joinedAt,
        isMuted: p.isMuted,
        deletedAt: p.deletedAt
      }
    }
  }).filter(c => {
    if (!c.myParticipantRecord.deletedAt) return true
    return c.lastActivity > c.myParticipantRecord.deletedAt
  }).sort((a, b) => {
    if (a.type === 'BROADCAST' && b.type !== 'BROADCAST') return -1;
    if (b.type === 'BROADCAST' && a.type !== 'BROADCAST') return 1;
    return b.lastActivity.getTime() - a.lastActivity.getTime();
  })
}

// Helper for UI unread indicators. We don't load all messages, just check if latest message > lastReadAt
function calculateUnreadCount(lastReadAt: Date | null, latestMessage: { createdAt: Date } | undefined) {
  if (!latestMessage) return 0
  if (!lastReadAt) return 1
  return latestMessage.createdAt > lastReadAt ? 1 : 0
}


/**
 * Marks a conversation as read for the current user.
 */
export async function markConversationRead(conversationId: string) {
  const { userId } = await authorizeConversationRead(conversationId)

  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId
      }
    },
    data: {
      lastReadAt: new Date()
    }
  })

  return { success: true }
}

/**
 * Toggles the mute status for a conversation for the current user.
 */
export async function toggleMuteConversation(conversationId: string, isMuted: boolean) {
  const { userId } = await authorizeConversationRead(conversationId)

  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId,
        userId
      }
    },
    data: {
      isMuted
    }
  })

  return { success: true }
}

/**
 * Creates a new broadcast conversation and fans out to all active members.
 * Requires Admin privileges.
 */
export async function createBroadcast(content: string) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Broadcast content cannot be empty')
  }
  if (content.length > 100000) {
    throw new Error('Broadcast content is too long')
  }

  // Uses the existing requireAdmin helper from Group 2 rules (or directly here)
  const { auth: clerkAuth } = await import('@clerk/nextjs/server')
  const { userId, orgId, orgRole } = await clerkAuth()
  
  if (!userId || !orgId) throw new Error('Unauthorized')
  if (orgRole !== 'org:admin') throw new Error('Forbidden: Admins only')

  await requirePlan(orgId, 'messages')

  // Fetch all active members in the business
  const members = await prisma.businessMembership.findMany({
    where: { businessId: orgId }
  })

  if (members.length === 0) {
    throw new Error('No members found to broadcast to')
  }

  await checkMessageRateLimit(userId)

  const participantData = members.map(m => ({
    userId: m.userId
  }))

  const broadcast = await prisma.$transaction(async (tx) => {
    // 1. Find existing broadcast conversation or create one
    let conversation = await tx.conversation.findFirst({
      where: { businessId: orgId, type: 'BROADCAST' }
    })

    if (!conversation) {
      conversation = await tx.conversation.create({
        data: {
          businessId: orgId,
          type: 'BROADCAST',
          createdBy: userId,
          participants: {
            create: participantData
          }
        }
      })
    } else {
      // Ensure all active members are participants
      const existingParticipants = await tx.conversationParticipant.findMany({
        where: { conversationId: conversation.id }
      })
      const existingUserIds = existingParticipants.map(p => p.userId)
      const newParticipants = participantData.filter(p => !existingUserIds.includes(p.userId))
      
      if (newParticipants.length > 0) {
        await tx.conversationParticipant.createMany({
          data: newParticipants.map(p => ({
            conversationId: conversation!.id,
            userId: p.userId
          }))
        })
      }
    }

    // 2. Create the broadcast message
    const message = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        content: content.trim()
      }
    })

    // 3. Write an AuditLog entry
    await tx.auditLog.create({
      data: {
        businessId: orgId,
        entityType: 'Broadcast',
        entityId: conversation.id,
        action: 'BROADCAST_SENT',
        actorUserId: userId,
        metadataJson: JSON.stringify({ recipientCount: members.length })
      }
    })

    // Group 7: Notifications (notify all members who received it)
    await createManyNotifications(
      members.map(m => m.userId),
      {
        businessId: orgId,
        title: 'New Broadcast Announcement',
        message: 'A new announcement has been posted.',
        type: 'message',
        actionUrl: `/dashboard/messages/${conversation.id}`
      },
      tx
    )

    return { conversation, message }
  })

  return broadcast
}


/**
 * Creates a new GROUP conversation.
 */
export async function createGroupConversation(memberIds: string[], title?: string) {
  if (!Array.isArray(memberIds)) {
    throw new Error('Invalid members format')
  }
  if (title && (typeof title !== 'string' || title.length > 200)) {
    throw new Error('Invalid title')
  }
  
  const { userId, orgId } = await auth()
  if (!userId || !orgId) throw new Error('Unauthorized')

  await requirePlan(orgId, 'messages')

  // Create a clean set of valid string IDs (limit to 1000 for generous scale)
  const uniqueMemberIds = Array.from(new Set(memberIds)).filter(id => typeof id === 'string')
  
  if (uniqueMemberIds.length > 1000) {
    throw new Error('Cannot add more than 1000 members at a time')
  }
  
  if (!uniqueMemberIds.includes(userId)) {
    uniqueMemberIds.push(userId)
  }

  if (uniqueMemberIds.length < 2) {
    throw new Error('Group chat must have at least 2 participants')
  }

  // IDOR check: Verify all users belong to the current business
  const memberships = await prisma.businessMembership.findMany({
    where: {
      businessId: orgId,
      userId: { in: uniqueMemberIds }
    },
    select: { userId: true }
  })

  if (memberships.length !== uniqueMemberIds.length) {
    throw new Error('One or more selected users do not belong to this business')
  }

  // Create new GROUP conversation
  const newConversation = await prisma.conversation.create({
    data: {
      businessId: orgId,
      type: 'GROUP',
      title: title?.trim() || undefined,
      createdBy: userId,
      participants: {
        create: uniqueMemberIds.map(id => ({ userId: id }))
      }
    },
    include: {
      participants: true
    }
  })

  return newConversation
}

/**
 * Deletes a conversation.
 * Admins -> Hard delete (completely removes from DB).
 * Members -> Soft delete (hides it and its history until a new message arrives).
 */
export async function deleteConversation(conversationId: string) {
  const { userId, orgRole, conversation } = await authorizeConversationWrite(conversationId)

  const isAdmin = orgRole === 'org:admin'
  
  if (conversation.type === 'BROADCAST') {
    throw new Error('Broadcast channels cannot be deleted entirely. You can only delete individual messages.')
  }

  if (isAdmin) {
    await prisma.conversation.delete({ where: { id: conversationId } })
    return { type: 'hard' }
  } else {
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { deletedAt: new Date() }
    })
    return { type: 'soft' }
  }
}

/**
 * Creates a generic Guest Chat Link for the business (can be sent to any client).
 */
export async function createBusinessGuestChatLink() {
  const { auth: clerkAuth } = await import('@clerk/nextjs/server')
  const { userId, orgId } = await clerkAuth()
  if (!userId || !orgId) throw new Error('Unauthorized')

  // Issuing a new guest link is gated; links already handed out keep working,
  // so a lapsed plan never breaks a chat a client is mid-conversation in.
  await requirePlan(orgId, 'messages')

  const { v4: uuidv4 } = await import('uuid')
  const token = uuidv4()
  
  // Get creator info
  const creator = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true }
  })
  const creatorName = [creator?.firstName, creator?.lastName].filter(Boolean).join(' ') || 'Member'
  
  // Get all admins in the org
  const admins = await prisma.businessMembership.findMany({
    where: { businessId: orgId, role: 'org:admin' },
    select: { userId: true }
  })
  
  // Ensure uniqueness of participants
  const participantIds = new Set([userId, ...admins.map(a => a.userId)])

  const conversation = await prisma.conversation.create({
    data: {
      businessId: orgId,
      type: 'GUEST_LINK',
      guestToken: token,
      createdBy: userId,
      title: `Guest Chat (created by ${creatorName})`,
      participants: {
        create: Array.from(participantIds).map(id => ({ userId: id }))
      }
    }
  })

  return { conversationId: conversation.id, token }
}
