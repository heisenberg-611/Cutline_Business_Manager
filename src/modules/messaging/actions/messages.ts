'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import * as Ably from 'ably'
import { authorizeConversationRead, authorizeConversationWrite } from '../auth'
import { checkMessageRateLimit } from '@/lib/utils/rate-limit'
import { createManyNotifications } from '@/modules/notifications/services'
import { conversationChannel, userSidebarChannel } from '@/lib/ably/channels'

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
    },
    include: {
      sender: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          memberships: {
            where: { businessId: orgId },
            select: { role: true }
          }
        }
      }
    }
  })

  if (process.env.ABLY_API_KEY) {
    try {
      const ably = new Ably.Rest(process.env.ABLY_API_KEY);
      
      const channel = ably.channels.get(conversationChannel(orgId, conversationId));
      await channel.publish('new-message', message);

      // Sidebar updates go to each participant individually. They used to go
      // to one channel every member of the business subscribed to, and the
      // payload includes the message — so every direct message was delivered
      // to the whole organization.
      const update = { conversationId, message, timestamp: new Date() };
      await Promise.all(
        conversation.participants.map((participant) =>
          ably.channels
            .get(userSidebarChannel(participant.userId))
            .publish('sidebar-update', update)
        )
      );
    } catch (e) {
      console.error('Ably publish error:', e);
    }
  }

  // Group 7: Notifications
  if (conversation.type === 'DIRECT' || conversation.type === 'GROUP' || conversation.type === 'BROADCAST') {
    const recipients = conversation.participants.filter(p => p.userId !== userId && !p.isMuted)
    
    if (recipients.length > 0) {
      let title = 'New Direct Message';
      if (conversation.type === 'GROUP') title = `New Message in ${conversation.title || 'Group'}`;
      if (conversation.type === 'BROADCAST') title = 'New Broadcast Announcement';
      
      await createManyNotifications(
        recipients.map(r => r.userId),
        {
          businessId: orgId,
          title,
          message: 'You have received a new message.',
          type: 'message',
          actionUrl: `/dashboard/messages/${conversationId}`
        }
      )
    }
  }

  return message
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
        select: {
          firstName: true,
          lastName: true,
          email: true,
          memberships: {
            where: { businessId: orgId },
            select: { role: true }
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