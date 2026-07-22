'use server';

import prisma from '@/modules/core/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '../actions';

export async function markMessageAsRead(id: string) {
  await requireAdmin(); // SECURITY CHECK
  
  await prisma.systemContactMessage.update({
    where: { id },
    data: { isRead: true },
  });
  
  revalidatePath('/admin/messages');
}

export async function deleteMessage(id: string) {
  const admin = await requireAdmin(); // SECURITY CHECK
  
  await prisma.systemContactMessage.delete({
    where: { id },
  });
  
  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'DELETE_SYSTEM_MESSAGE',
      targetId: id,
    }
  });
  
  revalidatePath('/admin/messages');
}
