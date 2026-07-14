import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'

export async function authorizeConversationRead(conversationId: string) {
  const { userId, orgId } = await auth()
  
  if (!userId || !orgId) {
    throw new Error('Unauthorized')
  }

  // 1. All queries filtered by businessId first.
  // 2. Verified by membership lookup (participant constraint)
  const conversation = await prisma.conversation.findFirst({
    where: { 
      id: conversationId, 
      businessId: orgId,
      participants: {
        some: { userId }
      }
    },
    include: {
      participants: true
    }
  })

  if (!conversation) {
    throw new Error('Conversation not found or access denied')
  }

  return { userId, orgId, conversation }
}

export async function authorizeConversationWrite(conversationId: string) {
  const { userId, orgId, orgRole } = await auth()
  
  if (!userId || !orgId) {
    throw new Error('Unauthorized')
  }

  const conversation = await prisma.conversation.findFirst({
    where: { 
      id: conversationId, 
      businessId: orgId,
      participants: {
        some: { userId }
      }
    },
    include: {
      participants: true
    }
  })

  if (!conversation) {
    throw new Error('Conversation not found or access denied')
  }

  // BROADCAST conversations: members can read, but send/post action rejects non-admin
  if (conversation.type === 'BROADCAST' && orgRole !== 'org:admin') {
    throw new Error('Forbidden: Only admins can send broadcast messages')
  }

  return { userId, orgId, orgRole, conversation }
}
