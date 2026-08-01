'use server';

import prisma from '@/modules/core/db/prisma';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { checkAdminAuthRateLimit } from '@/lib/utils/rate-limit';

const COOKIE_NAME = 'admin_session';

export async function verifyAdminSession() {
  const cookieStore = await cookies();
  const email = cookieStore.get(COOKIE_NAME)?.value;
  if (!email) return null;

  const admin = await prisma.globalAdmin.findUnique({ where: { email } });
  if (!admin || !admin.passwordHash) return null;
  
  return admin;
}

export async function requireAdmin() {
  const admin = await verifyAdminSession();
  if (!admin) {
    throw new Error('Unauthorized');
  }
  return admin;
}

export async function loginAdmin(email: string, password: string) {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "anonymous";
  
  const rateLimit = await checkAdminAuthRateLimit(ip);
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error };
  }

  const admin = await prisma.globalAdmin.findUnique({ where: { email } });
  
  if (!admin) {
    // Return generic error to avoid user enumeration
    return { success: false, error: 'Invalid credentials' };
  }

  // If passwordHash is null, this is their first time logging in, so we SET it.
  if (!admin.passwordHash) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.globalAdmin.update({
      where: { email },
      data: { passwordHash },
    });
  } else {
    // If passwordHash exists, verify it
    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) return { success: false, error: 'Invalid credentials' };
  }

  const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' } });
  const timeoutMinutes = settings?.sessionTimeoutMinutes || 15;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: timeoutMinutes * 60,
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: email,
      action: 'ADMIN_LOGIN',
      targetId: email,
      metadata: { ip }
    }
  });

  revalidatePath('/hq');
  return { success: true };
}

export async function logoutAdmin() {
  const admin = await verifyAdminSession();
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  
  if (admin) {
    await prisma.adminAuditLog.create({
      data: {
        adminEmail: admin.email,
        action: 'ADMIN_LOGOUT',
        targetId: admin.email,
      }
    });
  }
  
  revalidatePath('/hq');
}

export async function addAdmin(email: string) {
  const admin = await requireAdmin(); // SECURITY CHECK
  await prisma.globalAdmin.create({
    data: { email },
  });
  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'ADD_ADMIN',
      targetId: email,
    }
  });
  revalidatePath('/hq/admins');
  return { success: true };
}

export async function removeAdmin(email: string) {
  const admin = await requireAdmin(); // SECURITY CHECK
  await prisma.globalAdmin.delete({
    where: { email },
  });
  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'REMOVE_ADMIN',
      targetId: email,
    }
  });
  revalidatePath('/hq/admins');
  return { success: true };
}
