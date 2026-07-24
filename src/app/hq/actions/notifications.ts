'use server';

import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../actions';
import { revalidatePath } from 'next/cache';

export async function getUnreadAdminNotifications() {
  await requireAdmin();
  const notifications = await prisma.adminNotification.findMany({
    where: { isRead: false },
    orderBy: { createdAt: 'desc' },
  });
  return notifications;
}

export async function markAdminNotificationRead(id: string) {
  await requireAdmin();
  await prisma.adminNotification.update({
    where: { id },
    data: { isRead: true },
  });
  revalidatePath('/hq');
}

export async function markAllAdminNotificationsRead() {
  await requireAdmin();
  await prisma.adminNotification.updateMany({
    where: { isRead: false },
    data: { isRead: true },
  });
  revalidatePath('/hq');
}
