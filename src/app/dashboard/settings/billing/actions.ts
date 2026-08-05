'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { PLANS, restorablePlan } from '@/lib/subscription';
import { createAdminNotification } from '@/lib/admin-notifications';
import { requireAdmin } from '@/lib/auth';
import { syncClerkSeatCap } from '@/lib/plan-guard';

export async function cancelSubscription() {
  const { orgId } = await requireAdmin();

  await prisma.business.update({
    where: { id: orgId },
    data: {
      subscriptionPlan: PLANS.FREE,
      // Cancelling gives up the entitlement, so there is nothing to restore.
      purchasedPlan: null,
      subscriptionPeriodEnd: null,
    }
  });

  await syncClerkSeatCap(orgId, PLANS.FREE);

  revalidatePath('/dashboard/settings/billing');
}

export async function downgradeToPro() {
  const { orgId } = await requireAdmin();

  // Verify they are actually on business
  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { subscriptionPlan: true }
  });

  if (business?.subscriptionPlan !== PLANS.BUSINESS) {
    throw new Error('You must be on the Business plan to downgrade to Pro');
  }

  await prisma.business.update({
    where: { id: orgId },
    data: {
      subscriptionPlan: PLANS.PRO,
      // We do NOT nullify subscriptionPeriodEnd because they retain their remaining time
    }
  });

  await syncClerkSeatCap(orgId, PLANS.PRO);

  revalidatePath('/dashboard/settings/billing');
}

export async function restoreBusinessPlan() {
  const { orgId } = await requireAdmin();

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { subscriptionPlan: true, purchasedPlan: true, subscriptionPeriodEnd: true }
  });

  if (!business) throw new Error('Business not found');

  // The same helper the billing page uses to decide whether to show the button,
  // so the two cannot disagree about who is entitled to restore.
  const restorable = restorablePlan(business);

  if (!restorable) {
    throw new Error('You have no paid plan to restore for the current period');
  }

  await prisma.business.update({
    where: { id: orgId },
    data: {
      subscriptionPlan: restorable
    }
  });

  await syncClerkSeatCap(orgId, restorable);

  revalidatePath('/dashboard/settings/billing');
}

export async function submitUpgradeRequest(message: string) {
  const { userId, orgId } = await requireAdmin();

  // Verify business exists
  const business = await prisma.business.findUnique({
    where: { id: orgId },
  });
  if (!business) throw new Error('Business not found');

  await prisma.upgradeRequest.create({
    data: {
      businessId: orgId,
      userId,
      planRequested: PLANS.BUSINESS,
      message,
    }
  });

  await createAdminNotification({
    title: 'New Upgrade Request',
    message: `${business.name} has requested an upgrade to the Business plan.`,
    type: 'upgrade',
    actionUrl: '/hq/subscriptions',
  });

  revalidatePath('/dashboard/settings/billing');
}
