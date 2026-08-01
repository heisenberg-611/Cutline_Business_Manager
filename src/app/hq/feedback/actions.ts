'use server';

import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../actions';
import { revalidatePath } from 'next/cache';

export async function updateFeedbackStatus(id: string, status: string) {
  try {
    const admin = await requireAdmin();
    
    await prisma.platformFeedback.update({
      where: { id },
      data: { status },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'UPDATE_FEEDBACK_STATUS',
        targetId: id,
        metadata: { status }
      }
    });
    
    revalidatePath('/hq/feedback');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update feedback status:', error);
    return { success: false, error: error.message || 'Failed to update status' };
  }
}

export async function deleteFeedback(id: string) {
  try {
    const admin = await requireAdmin();
    
    await prisma.platformFeedback.delete({
      where: { id },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'DELETE_FEEDBACK',
        targetId: id,
      }
    });
    
    revalidatePath('/hq/feedback');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete feedback:', error);
    return { success: false, error: error.message || 'Failed to delete feedback' };
  }
}
