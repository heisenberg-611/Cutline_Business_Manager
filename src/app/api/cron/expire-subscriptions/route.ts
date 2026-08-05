import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/modules/core/db/prisma'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { syncClerkSeatCap } from '@/lib/plan-guard'
import { PLANS } from '@/lib/subscription'
import { createAdminNotification } from '@/lib/admin-notifications'

/**
 * Transitions lapsed subscriptions to FREE.
 *
 * Nothing did this before. getActivePlan() masked it at read time so feature
 * gating stayed correct, but the stored plan never changed, which meant every
 * consumer that read the column directly drifted: MRR counted lapsed
 * subscribers, and the Clerk seat cap stayed at the Business allowance because
 * syncClerkSeatCap only runs on an explicit plan change.
 *
 * Idempotent — a business already on FREE is not selected — so it is safe to
 * run on any schedule and safe to re-run after a failure.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const now = new Date()

  const lapsed = await prisma.business.findMany({
    where: {
      subscriptionPlan: { not: PLANS.FREE },
      // A null period end is a deliberate admin override meaning "no expiry",
      // so it must never be swept up here.
      subscriptionPeriodEnd: { not: null, lt: now },
    },
    select: { id: true, name: true, subscriptionPlan: true, subscriptionPeriodEnd: true },
  })

  const expired: { id: string; name: string; from: string }[] = []
  const failures: string[] = []

  for (const business of lapsed) {
    try {
      await prisma.business.update({
        where: { id: business.id },
        data: {
          subscriptionPlan: PLANS.FREE,
          // The paid period is over, so there is no entitlement left to restore.
          purchasedPlan: null,
        },
      })

      // Bring Clerk's seat cap back down. Without this a lapsed Business
      // organization keeps its full seat allowance indefinitely.
      await syncClerkSeatCap(business.id, PLANS.FREE)

      expired.push({ id: business.id, name: business.name, from: business.subscriptionPlan })
    } catch (error) {
      // One failure must not abandon the rest of the sweep.
      console.error(`[expire-subscriptions] ${business.id} failed:`, error)
      failures.push(business.id)
    }
  }

  if (expired.length > 0) {
    await prisma.adminAuditLog.create({
      data: {
        adminEmail: 'system@cron',
        action: 'EXPIRE_SUBSCRIPTIONS',
        targetId: 'global',
        metadata: { expired, failures },
      },
    })

    // Renewals are collected by hand, so someone has to know this happened.
    await createAdminNotification({
      title: `${expired.length} subscription${expired.length === 1 ? '' : 's'} expired`,
      message: expired.map((e) => `${e.name} (${e.from} → FREE)`).join(', '),
      type: 'subscription',
      actionUrl: '/hq/organizations',
    })
  }

  return NextResponse.json({
    success: true,
    checked: lapsed.length,
    expired: expired.length,
    failed: failures.length,
  })
}
