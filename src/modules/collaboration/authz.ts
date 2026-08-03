import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { authorizeProjectAccess, type ProjectAccessLevel } from '@/modules/projects/authz'
import { canUseTeamCollaboration } from '@/lib/subscription'
import { getActivePlan } from '@/lib/subscription'

/**
 * Entity types that can be commented on. Adding one here is deliberate: each
 * needs an authorization rule below, so an unknown type is rejected rather
 * than silently allowed.
 */
export const COMMENTABLE_TYPES = ['Project'] as const
export type CommentableType = (typeof COMMENTABLE_TYPES)[number]

export function isCommentableType(value: string): value is CommentableType {
  return (COMMENTABLE_TYPES as readonly string[]).includes(value)
}

/**
 * Collaboration is a BUSINESS-tier feature. Checked on the server for every
 * mutation — hiding the UI is not access control.
 */
export async function requireCollaborationPlan(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { subscriptionPlan: true, subscriptionPeriodEnd: true },
  })

  if (!business || !canUseTeamCollaboration(getActivePlan(business))) {
    throw new Error('Team collaboration is available on the Business plan.')
  }
}

/**
 * Resolves access for whatever the comment is attached to, so comment
 * permissions can never exceed permissions on the underlying record.
 */
export async function authorizeEntityAccess(
  entityType: string,
  entityId: string,
  level: ProjectAccessLevel
): Promise<{ userId: string; orgId: string; isAdmin: boolean }> {
  if (!isCommentableType(entityType)) {
    throw new Error(`Unsupported comment target: ${entityType}`)
  }

  switch (entityType) {
    case 'Project': {
      const ctx = await authorizeProjectAccess(entityId, level)
      await requireCollaborationPlan(ctx.orgId)
      return { userId: ctx.userId, orgId: ctx.orgId, isAdmin: ctx.isAdmin }
    }
  }
}

/**
 * Session context for actions that operate on a comment id, where the target
 * entity is only known after loading the row.
 */
export async function requireSession() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId || !orgId) throw new Error('Unauthorized')
  return { userId, orgId, orgRole }
}
