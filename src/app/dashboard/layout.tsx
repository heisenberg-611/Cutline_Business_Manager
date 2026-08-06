import { AppLayout } from '@/modules/core/ui/AppLayout'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { GlobalAlerts } from './components/GlobalAlerts'
import { getActivePlan, canInviteMembers } from '@/lib/subscription'
import { syncClerkSeatCap } from '@/lib/plan-guard'
import { PlanLockedScreen } from '@/modules/core/ui/PlanLockedScreen'
import { getCachedActiveAlerts, getCachedGlobalSettings } from '@/lib/global-cache'
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

  // Cached: this layout re-renders on every mutation anywhere under /dashboard,
  // and neither of these is per-user. Invalidated by tag from HQ when they change.
  const [activeAlerts, globalSettings] = await Promise.all([
    getCachedActiveAlerts(),
    getCachedGlobalSettings()
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

      // Self-heal a stale Clerk seat cap, covering the window between a
      // subscription lapsing and the nightly expiry cron catching it: until
      // then the stored plan still says BUSINESS while the active plan is FREE,
      // leaving Clerk uncapped and happy to accept invites.
      //
      // (The comment here used to say no expiry job existed. One does now —
      // /api/cron/expire-subscriptions, 02:00 daily — which is what closes the
      // drift for good; this only narrows the gap until it runs.)
      //
      // Kept in the render path deliberately. It fires only on real drift, so
      // in steady state it costs a boolean rather than a request, and the
      // business row it tests was already being read for the seat check below.
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
