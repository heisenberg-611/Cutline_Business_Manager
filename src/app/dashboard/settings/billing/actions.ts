'use server';

import { auth } from '@clerk/nextjs/server';
import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { PLANS } from '@/lib/subscription';
import { createAdminNotification } from '@/lib/admin-notifications';

export async function cancelSubscription() {
  const { orgId } = await auth();
  if (!orgId) throw new Error('Unauthorized');

  await prisma.business.update({
    where: { id: orgId },
    data: {
      subscriptionPlan: PLANS.FREE,
      subscriptionPeriodEnd: null,
    }
  });

  revalidatePath('/dashboard/settings/billing');
}

export async function downgradeToPro() {
  const { orgId } = await auth();
  if (!orgId) throw new Error('Unauthorized');

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

  revalidatePath('/dashboard/settings/billing');
}

export async function restoreBusinessPlan() {
  const { orgId } = await auth();
  if (!orgId) throw new Error('Unauthorized');

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { subscriptionPeriodEnd: true }
  });

  if (!business || !business.subscriptionPeriodEnd || new Date() > business.subscriptionPeriodEnd) {
    throw new Error('No active subscription period');
  }

  const lastRequest = await prisma.subscriptionRequest.findFirst({
    where: {
      businessId: orgId,
      status: 'APPROVED'
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

  revalidatePath('/dashboard/settings/billing');
}

export async function submitUpgradeRequest(message: string) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) throw new Error('Unauthorized');

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
