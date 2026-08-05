import { AppLayout } from '@/modules/core/ui/AppLayout'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { GlobalAlerts } from './components/GlobalAlerts'
import { getActivePlan, canInviteMembers } from '@/lib/subscription'
import { syncClerkSeatCap } from '@/lib/plan-guard'
import { PlanLockedScreen } from '@/modules/core/ui/PlanLockedScreen'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId, orgId } = await auth()
  let initialNavPreferences: { href: string; visible: boolean }[] | undefined = undefined
  let initialQuickActionPreferences: { id: string; visible: boolean }[] | undefined = undefined
  let initialNotificationPreferences: { tone: string; dnd: boolean } | undefined = undefined

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { navPreferences: true, quickActionPreferences: true, notificationPreferences: true }
    })
    
    if (user?.navPreferences) {
      initialNavPreferences = user.navPreferences as { href: string; visible: boolean }[]
    }
    if (user?.quickActionPreferences) {
      initialQuickActionPreferences = user.quickActionPreferences as { id: string; visible: boolean }[]
    }
    if (user?.notificationPreferences) {
      initialNotificationPreferences = user.notificationPreferences as { tone: string; dnd: boolean }
    }
  }

  const [activeAlerts, globalSettings] = await Promise.all([
    prisma.systemAlert.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.globalSettings.findUnique({ where: { id: 'default' } })
  ]);

  if (globalSettings?.maintenanceMode) {
    redirect('/maintenance');
  }

  let canInvite = false;
  let seatLocked = false;
  if (orgId) {
    const business = await prisma.business.findUnique({
      where: { id: orgId },
      select: { subscriptionPlan: true, subscriptionPeriodEnd: true, ownerUserId: true }
    });
    if (business) {
      const activePlan = getActivePlan(business);
      canInvite = canInviteMembers(activePlan);

      // Self-heal a stale Clerk seat cap. Nothing runs when a subscription
      // simply lapses — there is no expiry job — so the stored plan can still
      // say BUSINESS while the active plan is FREE, leaving Clerk uncapped and
      // happy to accept invites. Only fires on real drift, and only to tighten.
      if (!canInvite && canInviteMembers(business.subscriptionPlan)) {
        await syncClerkSeatCap(orgId, activePlan);
      }

      // Members beyond the owner keep working after a downgrade unless they are
      // stopped here: Clerk's cap blocks new joins but never evicts existing
      // ones, which is the point — re-upgrading restores the team instantly.
      //
      // Owner rather than org:admin, or an org with several admins would keep
      // that many full-access seats. Where the owner is unknown (a row not yet
      // covered by scripts/backfill-business-owner.ts) nobody is locked: an
      // unbackfilled row must not lock out the real owner.
      seatLocked =
        !canInvite && !!business.ownerUserId && business.ownerUserId !== userId;
    }
  }

  return (
    <>
      <GlobalAlerts alerts={activeAlerts} />
      <AppLayout 
        initialNavPreferences={initialNavPreferences} 
        initialQuickActionPreferences={initialQuickActionPreferences} 
        initialNotificationPreferences={initialNotificationPreferences}
        canInvite={canInvite}
        globalSettings={{
          termsUrl: globalSettings?.termsUrl,
          privacyUrl: globalSettings?.privacyUrl,
          supportEmail: globalSettings?.supportEmail
        }}
      >
        {seatLocked ? (
          <PlanLockedScreen
            tier="Business"
            description="Team seats are part of the Business plan. This workspace is no longer on that plan, so access is limited to its owner. Ask them to upgrade to restore your access — your projects, tasks and assignments are untouched in the meantime."
            action={null}
          />
        ) : (
          children
        )}
      </AppLayout>
    </>
  )
}
