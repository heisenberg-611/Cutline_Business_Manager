'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/modules/core/db/prisma';
import { PLANS } from '@/lib/subscription';
import { syncClerkSeatCap } from '@/lib/plan-guard';

/**
 * Grants the one-time Pro trial.
 *
 * Deliberately an action rather than work done while rendering the page: a GET
 * that mutates can be fired by a link prefetch, a crawler, or a browser
 * preconnect, none of which represent someone choosing to start a trial.
 */
export async function claimFreeTrial() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error('Unauthorized');

  const [business, user, settings] = await Promise.all([
    prisma.business.findUnique({
      where: { id: orgId },
      select: { subscriptionPlan: true, hasUsedFreeTrial: true }
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { hasUsedFreeTrial: true } }),
    prisma.globalSettings.findUnique({ where: { id: 'default' } })
  ]);

  if (!user || !business) redirect('/dashboard?error=trial_unavailable');

  // Both flags are checked. The user flag alone let a second member of the same
  // business claim a fresh trial for a workspace that had already had one.
  if (user.hasUsedFreeTrial || business.hasUsedFreeTrial) {
    redirect('/dashboard?error=trial_already_used');
  }

  if (business.subscriptionPlan !== PLANS.FREE) {
    redirect('/dashboard?error=trial_unavailable');
  }

  const trialDays = settings?.defaultTrialDays || 30;
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + trialDays);

  await prisma.$transaction([
    prisma.business.update({
      where: { id: orgId },
      data: {
        subscriptionPlan: PLANS.PRO,
        purchasedPlan: PLANS.PRO,
        subscriptionPeriodEnd: trialEndDate,
        hasUsedFreeTrial: true
      }
    }),
    prisma.user.update({
      where: { id: userId },
      data: { hasUsedFreeTrial: true }
    })
  ]);

  // Pro carries no team seats, so this pins the cap at 1 rather than leaving
  // whatever the previous plan set.
  await syncClerkSeatCap(orgId, PLANS.PRO);

  redirect('/dashboard?trial_activated=true');
}
