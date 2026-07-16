'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { authorizeConversationRead, authorizeConversationWrite } from './auth'
import { checkMessageRateLimit } from '@/lib/utils/rate-limit'

/**
 * Gets or creates a DIRECT conversation between the current user and a target user.
 */
export async function getOrCreateDirectConversation(targetUserId: string) {
  if (typeof targetUserId !== 'string' || targetUserId.length > 100) {
    throw new Error('Invalid target user')
  }

  const { userId, orgId } = await auth()
  if (!userId || !orgId) throw new Error('Unauthorized')
  
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
 * Sends a message to a conversation.
 */
export async function sendMessage(conversationId: string, content: string) {
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Message content cannot be empty')
  }
  if (content.length > 50000) {
    throw new Error('Message content is too long')
  }

  // Group 2 Authorization logic inside here
  const { userId, orgId, orgRole, conversation } = await authorizeConversationWrite(conversationId)

  // Verify Admin Status
  const isAdmin = orgRole === 'org:admin'

  // Enforce Slow Mode for non-admins in group chats
  if (conversation.type === 'GROUP' && conversation.slowModeEnabled && !isAdmin) {
    const lastMessage = await prisma.message.findFirst({
      where: { conversationId, senderId: userId },
      orderBy: { createdAt: 'desc' }
    })
    
    if (lastMessage) {
      const timeSinceLastMessage = (Date.now() - lastMessage.createdAt.getTime()) / 1000
      if (timeSinceLastMessage < conversation.slowModeCooldown) {
        throw new Error(`Slow mode is active. Please wait ${Math.ceil(conversation.slowModeCooldown - timeSinceLastMessage)} seconds before sending another message.`)
      }
    }
  }

  await checkMessageRateLimit(userId)

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: content.trim()
    }
  })

  // Group 7: Notifications
  if (conversation.type === 'DIRECT' || conversation.type === 'GROUP') {
    const recipients = conversation.participants.filter(p => p.userId !== userId && !p.isMuted)
    
    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map(recipient => ({
          businessId: orgId,
          userId: recipient.userId,
          title: conversation.type === 'GROUP' ? `New Message in ${conversation.title || 'Group'}` : 'New Direct Message',
          message: 'You have received a new message.',
          type: 'message',
          actionUrl: `/dashboard/messages/${conversationId}`
        }))
      })
    }
  }

  return message
}

/**
 * Updates the slow mode settings for a conversation (Admins only)
 */
export async function updateSlowMode(conversationId: string, enabled: boolean, cooldown: number) {
  const { userId, orgRole, conversation } = await authorizeConversationWrite(conversationId)
  
  const isAdmin = orgRole === 'org:admin'
  
  if (!isAdmin) {
    throw new Error('Only administrators can update slow mode settings')
  }

  await prisma.conversation.update({
    where: { id: conversationId },
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
            include: { 
              user: {
                include: {
                  memberships: {
                    where: { businessId: orgId }
                  }
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
 * Fetches messages for a conversation with cursor pagination.
 */
export async function getMessages(conversationId: string, cursor?: string, take = 50) {
  const safeTake = Math.min(Math.max(Number(take) || 50, 1), 200)

  const { userId, orgId, conversation } = await authorizeConversationRead(conversationId)
  
  const participant = conversation.participants.find(p => p.userId === userId)
  const deletedAt = participant?.deletedAt

  const messages = await prisma.message.findMany({
    where: { 
      conversationId, 
      deletedAt: null,
      ...(deletedAt ? { createdAt: { gt: deletedAt } } : {})
    },
    take: safeTake + 1, // request 1 extra to see if there's another page
    ...(cursor && {
      skip: 1, // skip the cursor itself
      cursor: { id: cursor }
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      sender: {
        include: {
          memberships: {
            where: { businessId: orgId }
          }
        }
      }
    }
  })

  let nextCursor: string | undefined = undefined
  if (messages.length > safeTake) {
    const nextItem = messages.pop()
    nextCursor = nextItem!.id
  }

  // Return in chronological order (oldest to newest) for UI rendering
  return {
    messages: messages.reverse(),
    nextCursor
  }
}

/**
 * Fetches only new messages created after a specific date.
 */
export async function getNewMessages(conversationId: string, afterDate: Date) {
  const { userId, conversation } = await authorizeConversationRead(conversationId)

  const participant = conversation.participants.find(p => p.userId === userId)
  const deletedAt = participant?.deletedAt
  
  // If they soft-deleted, we only fetch messages after deletedAt OR afterDate (whichever is newer)
  const effectiveAfterDate = deletedAt && deletedAt > afterDate ? deletedAt : afterDate

  const messages = await prisma.message.findMany({
    where: { 
      conversationId, 
      deletedAt: null,
      createdAt: {
        gt: effectiveAfterDate
      }
    },
    orderBy: { createdAt: 'asc' }, // Get them oldest first so they append correctly
    include: {
      sender: true
    }
  })

  return messages
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
    await tx.notification.createMany({
      data: members.map(m => ({
        businessId: orgId,
        userId: m.userId,
        title: 'New Broadcast Announcement',
        message: 'A new announcement has been posted.',
        type: 'message',
        actionUrl: `/dashboard/messages/${conversation.id}`
      }))
    })

    return { conversation, message }
  })

  return broadcast
}

/**
 * Gets all active members in the business for the admin to select from when creating a new DM.
 */
export async function getMembersForMessaging() {
  const { auth: clerkAuth } = await import('@clerk/nextjs/server')
  const { userId, orgId, orgRole } = await clerkAuth()
  
  if (!userId || !orgId) {
    return []
  }

  const members = await prisma.businessMembership.findMany({
    where: { businessId: orgId, userId: { not: userId } },
    include: {
      user: true
    }
  })

  return members.map(m => m.user)
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
 * Admins can delete specific messages (mainly used for broadcast messages).
 */
export async function deleteMessage(messageId: string) {
  const { auth: clerkAuth } = await import('@clerk/nextjs/server')
  const { userId, orgId, orgRole } = await clerkAuth()
  if (!userId || !orgId || orgRole !== 'org:admin') throw new Error('Unauthorized')

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { conversation: true }
  })

  if (!message || message.conversation.businessId !== orgId) {
    throw new Error('Not found')
  }

  await prisma.message.delete({
    where: { id: messageId }
  })
  
  return { success: true }
}
