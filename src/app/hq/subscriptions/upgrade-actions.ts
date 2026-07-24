'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../actions';

export async function approveUpgradeRequest(requestId: string) {
  const admin = await requireAdmin(); // SECURITY CHECK

  const request = await prisma.upgradeRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error('Request not found');

  await prisma.$transaction([
    prisma.upgradeRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    }),
    prisma.notification.create({
      data: {
        businessId: request.businessId,
        userId: request.userId,
        title: 'Upgrade Request Approved',
        message: 'Your request to upgrade to the Business plan has been approved. You can now proceed to payment from your billing settings.',
        type: 'system',
        actionUrl: '/dashboard/settings/billing'
      }
    }),
    prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'APPROVE_UPGRADE_REQUEST',
        targetId: requestId,
        metadata: { businessId: request.businessId }
      }
    })
  ]);

  revalidatePath('/hq/subscriptions');
}

export async function rejectUpgradeRequest(requestId: string) {
  const admin = await requireAdmin(); // SECURITY CHECK
  
  const request = await prisma.upgradeRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error('Request not found');

  await prisma.$transaction([
    prisma.upgradeRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    }),
    prisma.notification.create({
      data: {
        businessId: request.businessId,
        userId: request.userId,
        title: 'Upgrade Request Rejected',
        message: 'Your request to upgrade to the Business plan has been rejected. Please contact support if you have any questions.',
        type: 'system',
      }
    }),
    prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'REJECT_UPGRADE_REQUEST',
        targetId: requestId,
      }
    })
  ]);

  revalidatePath('/hq/subscriptions');
}
