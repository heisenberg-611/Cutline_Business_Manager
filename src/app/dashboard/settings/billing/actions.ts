'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { PLANS } from '@/lib/subscription';
import { createAdminNotification } from '@/lib/admin-notifications';
import { requireAdmin } from '@/lib/auth';
import { syncClerkSeatCap } from '@/lib/plan-guard';

export async function cancelSubscription() {
  const { orgId } = await requireAdmin();

  await prisma.business.update({
    where: { id: orgId },
    data: {
      subscriptionPlan: PLANS.FREE,
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
    select: { subscriptionPlan: true, subscriptionPeriodEnd: true }
  });

  if (!business || !business.subscriptionPeriodEnd || new Date() > business.subscriptionPeriodEnd) {
    throw new Error('No active subscription period');
  }

  // This action exists to undo the user's own downgradeToPro, which leaves the
  // paid period intact — so PRO is the only state it may reverse. Without this,
  // it would also let a business climb back to BUSINESS from FREE, or from a
  // plan an HQ admin had deliberately reduced.
  if (business.subscriptionPlan !== PLANS.PRO) {
    throw new Error('Only a self-downgraded Pro plan can be restored to Business');
  }

  const lastRequest = await prisma.subscriptionRequest.findFirst({
    where: {
      businessId: orgId,
      status: 'APPROVED',
      // forceUpdateSubscription writes an APPROVED request purely for revenue
      // reporting whenever HQ sets a paid plan by hand. Those are not evidence
      // that this business ever paid for Business, so an HQ grant that was
      // later reduced must not be self-restorable.
      paymentMethod: { not: 'admin_override' }
    },
    orderBy: { updatedAt: 'desc' }
  });

  if (!lastRequest || lastRequest.planRequested !== PLANS.BUSINESS) {
    throw new Error('You do not have a previously approved Business plan');
  }

  await prisma.business.update({
    where: { id: orgId },
    data: {
      subscriptionPlan: PLANS.BUSINESS
    }
  });

  await syncClerkSeatCap(orgId, PLANS.BUSINESS);

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
