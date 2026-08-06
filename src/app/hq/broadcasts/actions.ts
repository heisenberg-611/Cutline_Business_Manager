'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { invalidateSystemAlerts } from '@/lib/global-cache';
import { requireAdmin } from '../actions';

export async function createBroadcast(title: string, message: string, type: string) {
  const admin = await requireAdmin();

  const alert = await prisma.systemAlert.create({
    data: {
      title,
      message,
      type,
      isActive: true,
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'CREATE_SYSTEM_BROADCAST',
      targetId: alert.id,
      metadata: { title, type }
    }
  });

  revalidatePath('/', 'layout');
  // The dashboard layout reads active alerts from cache; without this the
  // banner would wait out the fallback TTL.
  invalidateSystemAlerts();
}

export async function toggleBroadcast(id: string, isActive: boolean) {
  const admin = await requireAdmin();

  await prisma.systemAlert.update({
    where: { id },
    data: { isActive }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'TOGGLE_SYSTEM_BROADCAST',
      targetId: id,
      metadata: { isActive }
    }
  });

  revalidatePath('/', 'layout');
  // The dashboard layout reads active alerts from cache; without this the
  // banner would wait out the fallback TTL.
  invalidateSystemAlerts();
}

export async function deleteBroadcast(id: string) {
  const admin = await requireAdmin();

  await prisma.systemAlert.delete({
    where: { id }
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'DELETE_SYSTEM_BROADCAST',
      targetId: id,
    }
  });

  revalidatePath('/', 'layout');
  // The dashboard layout reads active alerts from cache; without this the
  // banner would wait out the fallback TTL.
  invalidateSystemAlerts();
}
