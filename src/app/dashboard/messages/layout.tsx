import { MessagingQueryProvider } from '@/modules/messaging/components/QueryProvider'
import { AblyProvider } from '@/modules/messaging/components/AblyProvider'
import { MessagingSidebar } from '@/modules/messaging/components/MessagingSidebar'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { canUseMessages, getActivePlan } from '@/lib/subscription'
import Link from 'next/link'
import { Lock } from 'lucide-react'

export const metadata = {
  title: 'Messages',
}

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgId, orgRole } = await auth()
  
  if (!userId || !orgId) return null

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { realtimeMessagesEnabled: true, subscriptionPlan: true, subscriptionPeriodEnd: true }
  })

  if (!business) return null;

  if (!canUseMessages(getActivePlan(business))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
          <Lock className="w-8 h-8 text-zinc-400" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Business Feature</h2>
        <p className="text-zinc-500 max-w-md mb-8">
          Realtime Messaging is an exclusive feature of the Business plan. Upgrade your subscription to communicate with clients and team members in real-time.
        </p>
        <Link 
          href="/dashboard/settings/billing" 
          className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          View Plans & Upgrade
        </Link>
      </div>
    );
  }

  return (
    <AblyProvider>
      <MessagingQueryProvider realtimeEnabled={business?.realtimeMessagesEnabled ?? true}>
        <div className="absolute top-0 left-0 right-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-0 flex bg-background overflow-hidden z-0">
          <MessagingSidebar currentUserId={userId} isAdmin={orgRole === 'org:admin'} />
          <div className="flex-1 flex flex-col min-w-0">
            {children}
          </div>
        </div>
      </MessagingQueryProvider>
    </AblyProvider>
  )
}
