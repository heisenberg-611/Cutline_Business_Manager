'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../actions';
import { SubscriptionPlan } from '@prisma/client';
import { syncClerkSeatCap } from '@/lib/plan-guard';

export async function forceUpdateSubscription(
  businessId: string,
  plan: SubscriptionPlan,
  periodEnd: Date | null,
  /**
   * Whole BDT actually collected out of band. Defaults to 0, because setting a
   * plan here is an entitlement change and not by itself a sale — an admin
   * fixing a mistake, extending a period or setting up a test would otherwise
   * book full list price as income. Pass the real figure for an offline sale.
   */
  amountPaid = 0
) {
  const admin = await requireAdmin();

  const operations: any[] = [
    prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionPlan: plan,
        // Reducing a plan here also reduces the entitlement, so an
        // administratively lowered plan cannot be self-restored afterwards.
        purchasedPlan: plan === 'FREE' ? null : plan,
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

  // A revenue row is written only when an amount was actually collected.
  // Previously any paid-plan grant created one at full list price, which is how
  // 60% of reported revenue came to be admin-granted rather than received.
  if (plan !== 'FREE' && amountPaid > 0) {
    operations.push(
      prisma.subscriptionRequest.create({
        data: {
          businessId,
          planRequested: plan,
          transactionId: `ADMIN-OVERRIDE-${crypto.randomUUID()}`,
          paymentMethod: 'admin_override',
          status: 'APPROVED',
          amountPaid,
          // Only a row carrying money is dated as income.
          paidAt: amountPaid > 0 ? new Date() : null,
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
      purchasedPlan: null,
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
