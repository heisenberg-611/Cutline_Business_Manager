import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { canUseTeamCollaboration, getActivePlan } from '@/lib/subscription'
import Link from 'next/link'
import { Lock } from 'lucide-react'

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-zinc-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Business Feature</h2>
        <p className="text-zinc-500 max-w-md mb-8">
          Team Collaboration is an exclusive feature of the Business plan. Upgrade your subscription to share projects with your team, assign tasks, and discuss work in context.
        </p>
        <Link
          href="/dashboard/settings/billing"
          className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          View Plans &amp; Upgrade
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
