import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { canUseTeamCollaboration, getActivePlan } from '@/lib/subscription'
import { PlanLockedScreen } from '@/modules/core/ui/PlanLockedScreen'

export const metadata = {
  title: 'Collaboration',
}

/**
 * Gates the whole section rather than each page.
 *
 * Mirrors how messages/layout.tsx handles the same situation, so a locked
 * feature looks the same wherever it is met — and so the index and the project
 * detail page cannot drift into answering the question differently.
 */
export default async function CollaborationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) return null

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { subscriptionPlan: true, subscriptionPeriodEnd: true },
  })

  if (!business) return null

  if (!canUseTeamCollaboration(getActivePlan(business))) {
    return (
      <PlanLockedScreen
        tier="Business"
        description="Team Collaboration is an exclusive feature of the Business plan. Upgrade your subscription to share projects with your team, assign tasks, and discuss work in context."
      />
    )
  }

  return <>{children}</>
}
