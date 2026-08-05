import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { requirePlan } from '@/lib/plan-guard'

/**
 * Messaging is a BUSINESS-tier feature, enforced here rather than in each
 * action: every conversation-scoped action already routes through one of these
 * two helpers, so this is the one place a new action cannot forget.
 *
 * The messages layout gates rendering, but a layout never runs before a Server
 * Action executes — so the layout alone left every action reachable by posting
 * its action id from any dashboard route.
 */
export async function authorizeConversationRead(conversationId: string) {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    throw new Error('Unauthorized')
  }

  await requirePlan(orgId, 'messages')

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

  await requirePlan(orgId, 'messages')

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
