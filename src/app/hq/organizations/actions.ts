'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../actions';
import { SubscriptionPlan } from '@prisma/client';
import { PLAN_PRICES } from '@/lib/subscription';
import { syncClerkSeatCap } from '@/lib/plan-guard';

export async function forceUpdateSubscription(businessId: string, plan: SubscriptionPlan, periodEnd: Date | null) {
  const admin = await requireAdmin();

  const operations: any[] = [
    prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionPlan: plan,
        subscriptionPeriodEnd: periodEnd,
      }
    }),
    prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'FORCE_UPDATE_SUBSCRIPTION',
        targetId: businessId,
        metadata: { plan, periodEnd }
      }
    }),
  ];

  // Auto-create an approved SubscriptionRequest for revenue tracking when upgrading to a paid plan
  if (plan !== 'FREE' && PLAN_PRICES[plan as keyof typeof PLAN_PRICES] > 0) {
    operations.push(
      prisma.subscriptionRequest.create({
        data: {
          businessId,
          planRequested: plan,
          transactionId: `ADMIN-OVERRIDE-${crypto.randomUUID()}`,
          paymentMethod: 'admin_override',
          status: 'APPROVED',
        }
      })
    );
  }

  await prisma.$transaction(operations);

  await syncClerkSeatCap(businessId, plan);

  revalidatePath('/hq/organizations');
  revalidatePath('/hq/finances');
  revalidatePath('/dashboard/settings/billing');
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

  await syncClerkSeatCap(businessId, 'FREE');

  revalidatePath('/hq/organizations');
  revalidatePath('/dashboard/settings/billing');
}
