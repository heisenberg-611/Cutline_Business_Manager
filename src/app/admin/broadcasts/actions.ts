'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../actions';

export async function createBroadcast(title: string, message: string, type: string) {
  await requireAdmin();

  await prisma.systemAlert.create({
    data: {
      title,
      message,
      type,
      isActive: true,
    }
  });

  revalidatePath('/', 'layout');
}

export async function toggleBroadcast(id: string, isActive: boolean) {
  await requireAdmin();

  await prisma.systemAlert.update({
    where: { id },
    data: { isActive }
  });

  revalidatePath('/', 'layout');
}

export async function deleteBroadcast(id: string) {
  await requireAdmin();

  await prisma.systemAlert.delete({
    where: { id }
  });

  revalidatePath('/', 'layout');
}
