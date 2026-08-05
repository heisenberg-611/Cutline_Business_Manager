'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { SubscriptionPlan } from '@prisma/client';
import { requireAdmin } from '../actions';
import { syncClerkSeatCap } from '@/lib/plan-guard';
import { PLAN_PRICES } from '@/lib/subscription';

export async function approveRequest(
  requestId: string,
  businessId: string,
  plan: SubscriptionPlan,
  /** Whole BDT actually collected. Defaults to list price; pass 0 for a comp. */
  amountPaid?: number
) {
  const admin = await requireAdmin(); // SECURITY CHECK
  // Add 30 days
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  await prisma.$transaction([
    prisma.subscriptionRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        // Captured now, so the figure cannot move when list prices change.
        amountPaid: amountPaid ?? PLAN_PRICES[plan as keyof typeof PLAN_PRICES] ?? 0,
      },
    }),
    prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionPlan: plan,
        // The entitlement, not just the active plan — this is what a later
        // voluntary downgrade can be restored back up to.
        purchasedPlan: plan,
        subscriptionPeriodEnd: periodEnd,
      },
    }),
    prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'APPROVE_SUBSCRIPTION_REQUEST',
        targetId: requestId,
        metadata: { businessId, plan }
      }
    })
  ]);

  await syncClerkSeatCap(businessId, plan);

  revalidatePath('/hq/subscriptions');
}

export async function rejectRequest(requestId: string) {
  const admin = await requireAdmin(); // SECURITY CHECK
  await prisma.subscriptionRequest.update({
    where: { id: requestId },
    data: { status: 'REJECTED' },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'REJECT_SUBSCRIPTION_REQUEST',
      targetId: requestId,
    }
  });
  
  revalidatePath('/hq/subscriptions');
}

/**
 * Voids rather than deletes. Revenue is derived from these rows, so removing one
 * silently rewrote historical totals with no way to see what changed.
 */
export async function deleteRequest(requestId: string) {
  const admin = await requireAdmin(); // SECURITY CHECK

  await prisma.subscriptionRequest.update({
    where: { id: requestId },
    data: { status: 'VOIDED' },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'VOID_SUBSCRIPTION_REQUEST',
      targetId: requestId,
    }
  });
  
  revalidatePath('/hq/subscriptions');
  revalidatePath('/hq/finances');
}
