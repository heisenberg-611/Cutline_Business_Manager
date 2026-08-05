'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { SubscriptionPlan } from '@prisma/client';
import { requireAdmin } from '../actions';
import { syncClerkSeatCap } from '@/lib/plan-guard';

export async function approveRequest(requestId: string, businessId: string, plan: SubscriptionPlan) {
  const admin = await requireAdmin(); // SECURITY CHECK
  // Add 30 days
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  await prisma.$transaction([
    prisma.subscriptionRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    }),
    prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionPlan: plan,
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

export async function deleteRequest(requestId: string) {
  const admin = await requireAdmin(); // SECURITY CHECK
  
  await prisma.subscriptionRequest.delete({
    where: { id: requestId },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'DELETE_SUBSCRIPTION_REQUEST',
      targetId: requestId,
    }
  });
  
  revalidatePath('/hq/subscriptions');
  revalidatePath('/hq/finances');
}
