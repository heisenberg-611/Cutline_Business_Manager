'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../actions';
import { SubscriptionPlan } from '@prisma/client';

export async function forceUpdateSubscription(businessId: string, plan: SubscriptionPlan, periodEnd: Date | null) {
  const admin = await requireAdmin();

  await prisma.business.update({
    where: { id: businessId },
    data: {
      subscriptionPlan: plan,
      subscriptionPeriodEnd: periodEnd,
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'FORCE_UPDATE_SUBSCRIPTION',
      targetId: businessId,
      metadata: { plan, periodEnd }
    }
  });

  revalidatePath('/admin/organizations');
  revalidatePath('/dashboard/settings/billing'); // In case the user is looking at their own dashboard
}

export async function revokeSubscription(businessId: string) {
  const admin = await requireAdmin();

  await prisma.business.update({
    where: { id: businessId },
    data: {
      subscriptionPlan: 'FREE',
      subscriptionPeriodEnd: null,
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'REVOKE_SUBSCRIPTION',
      targetId: businessId,
      metadata: { plan: 'FREE' }
    }
  });

  revalidatePath('/admin/organizations');
  revalidatePath('/dashboard/settings/billing');
}
