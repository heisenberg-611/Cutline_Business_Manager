'use server';

import prisma from '@/modules/core/db/prisma';
import { requireAdmin } from '../actions';
import {
  MAX_FAILED_LOGINS,
  SESSION_TIMEOUT_MINUTES,
  clampSetting,
} from '@/lib/admin-auth';
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

export async function updateGlobalSettings(raw: {
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
  businessTierSeatLimit: number;
  maxFailedLogins: number;
  sessionTimeoutMinutes: number;
}) {
  try {
    const admin = await requireAdmin(); // SECURITY CHECK
    
    const oldSettings = await prisma.globalSettings.findUnique({
      where: { id: 'default' }
    });

    // Clamped before storing as well as when read. A number input accepts
    // anything typed into it, and a negative maxFailedLogins would lock an
    // admin out on their first mistyped password.
    const data = {
      ...raw,
      maxFailedLogins: clampSetting(raw.maxFailedLogins, MAX_FAILED_LOGINS),
      sessionTimeoutMinutes: clampSetting(raw.sessionTimeoutMinutes, SESSION_TIMEOUT_MINUTES),
      freeTierProjectLimit: Math.max(0, Math.trunc(raw.freeTierProjectLimit || 0)),
      proTierProjectLimit: Math.max(0, Math.trunc(raw.proTierProjectLimit || 0)),
      businessTierSeatLimit: Math.max(0, Math.trunc(raw.businessTierSeatLimit || 0)),
      defaultTrialDays: Math.max(0, Math.trunc(raw.defaultTrialDays || 0)),
    };

    await prisma.globalSettings.upsert({
      where: { id: 'default' },
      update: { ...data },
      create: {
        id: 'default',
        ...data
      }
    });

    const changedCategories = new Set<string>();
    const changesByCat: Record<string, any> = {};

    const categories = {
      BILLING: ['paymentMethods', 'defaultTrialDays', 'defaultPlanId', 'freeTierProjectLimit', 'proTierProjectLimit', 'businessTierSeatLimit'],
      SECURITY: ['maintenanceMode', 'allowNewSignups', 'maxFailedLogins', 'sessionTimeoutMinutes'],
      SUPPORT: ['supportEmail', 'replyToEmail', 'termsUrl', 'privacyUrl']
    };

    if (oldSettings) {
      for (const field of Object.keys(data)) {
        const oldVal = JSON.stringify((oldSettings as any)[field]);
        const newVal = JSON.stringify((data as any)[field]);
        
        if (oldVal !== newVal) {
          let cat = 'GENERAL';
          for (const [c, fields] of Object.entries(categories)) {
            if (fields.includes(field)) {
              cat = c;
              break;
            }
          }
          
          changedCategories.add(cat);
          if (!changesByCat[cat]) changesByCat[cat] = {};
          changesByCat[cat][field] = { old: (oldSettings as any)[field], new: (data as any)[field] };
        }
      }
    } else {
      changedCategories.add('BILLING');
      changedCategories.add('SECURITY');
      changedCategories.add('SUPPORT');
      changedCategories.add('GENERAL');
      changesByCat['BILLING'] = { note: 'Initial setup' };
      changesByCat['SECURITY'] = { note: 'Initial setup' };
      changesByCat['SUPPORT'] = { note: 'Initial setup' };
      changesByCat['GENERAL'] = { note: 'Initial setup' };
    }

    if (changedCategories.size > 0) {
      const auditPromises = Array.from(changedCategories).map(cat => 
        prisma.adminAuditLog.create({
          data: {
            adminEmail: admin.email,
            action: `UPDATE_GLOBAL_SETTINGS_${cat}`,
            targetId: 'default',
            metadata: changesByCat[cat]
          }
        })
      );
      await Promise.all(auditPromises);
    }
    
    revalidatePath('/hq/settings');
    revalidatePath('/dashboard/settings/billing/checkout');
    
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update global settings:", error);
    return { success: false, error: error.message || 'An unknown error occurred while saving' };
  }
}
