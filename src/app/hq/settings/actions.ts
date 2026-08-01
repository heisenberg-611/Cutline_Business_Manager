'use server';

import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../actions';
import { revalidatePath } from 'next/cache';

export async function getGlobalSettings() {
  await requireAdmin(); // SECURITY CHECK: Prevent unauthenticated users from fetching global settings

  const settings = await prisma.globalSettings.findUnique({
    where: { id: 'default' }
  });
  
  if (!settings) {
    return await prisma.globalSettings.create({
      data: { id: 'default', paymentMethods: [] }
    });
  }
  
  return settings;
}

export async function updateGlobalSettings(data: {
  paymentMethods: any[];
  maintenanceMode: boolean;
  allowNewSignups: boolean;
  defaultTrialDays: number;
  defaultPlanId: string;
  supportEmail: string;
  replyToEmail: string;
  termsUrl: string;
  privacyUrl: string;
  freeTierProjectLimit: number;
  proTierProjectLimit: number;
  maxFailedLogins: number;
  sessionTimeoutMinutes: number;
}) {
  try {
    const admin = await requireAdmin(); // SECURITY CHECK
    
    await prisma.globalSettings.upsert({
      where: { id: 'default' },
      update: { ...data },
      create: {
        id: 'default',
        ...data
      }
    });

    await prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'UPDATE_GLOBAL_SETTINGS',
        targetId: 'default',
        metadata: data as any
      }
    });
    
    revalidatePath('/hq/settings');
    revalidatePath('/dashboard/settings/billing/checkout');
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update global settings:", error);
    return { success: false, error: error.message || 'An unknown error occurred while saving' };
  }
}
