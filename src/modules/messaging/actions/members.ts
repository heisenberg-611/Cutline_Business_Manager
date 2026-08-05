'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { authorizeConversationRead, authorizeConversationWrite } from '../auth'
import { getActivePlanFor } from '@/lib/plan-guard'
import { canUseMessages } from '@/lib/subscription'
import { checkMessageRateLimit } from '@/lib/utils/rate-limit'
import { sendPushNotification } from '@/lib/onesignal'


/**
 * Gets all active members in the business for the admin to select from when creating a new DM.
 */
export async function getMembersForMessaging() {
  const { auth: clerkAuth } = await import('@clerk/nextjs/server')
  const { userId, orgId, orgRole } = await clerkAuth()
  
  if (!userId || !orgId) {
    return []
  }

  // Empty rather than thrown, matching the missing-session case above.
  if (!canUseMessages(await getActivePlanFor(orgId))) {
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