'use server';

import prisma from '@/modules/core/db/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { checkAdminAuthRateLimit } from '@/lib/utils/rate-limit';
import { getAppUrl } from '@/lib/utils';
import { INVITE_TTL_HOURS, LOCKOUT_MINUTES, hashInviteToken } from '@/lib/admin-auth';
import { signAdminSession, verifyAdminSessionCookie } from '@/lib/admin-session';

const COOKIE_NAME = 'admin_session';

export async function verifyAdminSession() {
  const cookieStore = await cookies();

  // The cookie is signed, so a forged or tampered one never reaches the
  // database lookup. Verification proves we issued it and it has not expired;
  // it is not on its own proof the account still exists.
  const session = await verifyAdminSessionCookie(cookieStore.get(COOKIE_NAME)?.value);
  if (!session) return null;

  const admin = await prisma.globalAdmin.findUnique({ where: { email: session.email } });
  if (!admin || !admin.passwordHash) return null;

  // Revocation without a session table: any cookie issued before this instant
  // is stale, which is how a password change signs out other devices.
  if (admin.sessionsValidFrom && session.iat * 1000 < admin.sessionsValidFrom.getTime()) {
    return null;
  }

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
  const ip = headerList.get('x-forwarded-for') ?? 'anonymous';

  // First layer, IP-based. Silently absent when Upstash is not configured,
  // which is why the per-account lockout below does not depend on it.
  const rateLimit = await checkAdminAuthRateLimit(ip);
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error };
  }

  const admin = await prisma.globalAdmin.findUnique({ where: { email } });

  // Generic error throughout, so login cannot be used to discover which emails
  // are admins or which are still pending setup.
  const INVALID = { success: false, error: 'Invalid credentials' };

  if (!admin) return INVALID;

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    const minutes = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60_000);
    return {
      success: false,
      error: `Account locked after too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    };
  }

  // An invited-but-unaccepted account has no password. It must NOT be settable
  // from here: doing so let anyone who knew the email claim the account.
  if (!admin.passwordHash) return INVALID;

  const isValid = await bcrypt.compare(password, admin.passwordHash);

  if (!isValid) {
    const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' } });
    const threshold = settings?.maxFailedLogins || 5;
    const attempts = admin.failedLoginAttempts + 1;
    const shouldLock = attempts >= threshold;

    await prisma.globalAdmin.update({
      where: { email },
      data: {
        failedLoginAttempts: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
      },
    });

    if (shouldLock) {
      await prisma.adminAuditLog.create({
        data: {
          adminEmail: email,
          action: 'ADMIN_LOGIN_LOCKED',
          targetId: email,
          metadata: { ip, attempts, lockoutMinutes: LOCKOUT_MINUTES },
        },
      });
      return {
        success: false,
        error: `Account locked after ${threshold} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`,
      };
    }

    await prisma.adminAuditLog.create({
      data: {
        adminEmail: email,
        action: 'ADMIN_LOGIN_FAILED',
        targetId: email,
        metadata: { ip, attempts },
      },
    });

    return INVALID;
  }

  // Clear the failure counter only when it is actually dirty, to avoid a write
  // on every successful login.
  if (admin.failedLoginAttempts > 0 || admin.lockedUntil) {
    await prisma.globalAdmin.update({
      where: { email },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' } });
  const timeoutMinutes = settings?.sessionTimeoutMinutes || 15;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await signAdminSession(email, timeoutMinutes * 60), {
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
      metadata: { ip },
    },
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
      },
    });
  }

  revalidatePath('/hq');
}

/**
 * Creates the account and issues a one-time setup link. The raw token is
 * returned once, here, and never stored — if it is lost the invite has to be
 * regenerated rather than recovered.
 */
export async function addAdmin(email: string) {
  const admin = await requireAdmin(); // SECURITY CHECK

  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return { success: false, error: 'Enter a valid email address' };
  }

  const existing = await prisma.globalAdmin.findUnique({ where: { email: normalized } });
  if (existing) {
    return { success: false, error: 'That email is already an admin' };
  }

  const token = randomBytes(32).toString('base64url');

  await prisma.globalAdmin.create({
    data: {
      email: normalized,
      inviteTokenHash: hashInviteToken(token),
      inviteExpiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000),
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'ADD_ADMIN',
      targetId: normalized,
      metadata: { inviteExpiresInHours: INVITE_TTL_HOURS },
    },
  });

  revalidatePath('/hq/admins');
  return { success: true, inviteUrl: `${getAppUrl()}/admin-setup/${token}` };
}

/** Issues a fresh link when an invite has expired or the old one was lost. */
export async function regenerateAdminInvite(email: string) {
  const admin = await requireAdmin(); // SECURITY CHECK

  const target = await prisma.globalAdmin.findUnique({ where: { email } });
  if (!target) return { success: false, error: 'Admin not found' };
  if (target.passwordHash) {
    return { success: false, error: 'That admin has already set a password' };
  }

  const token = randomBytes(32).toString('base64url');

  await prisma.globalAdmin.update({
    where: { email },
    data: {
      inviteTokenHash: hashInviteToken(token),
      inviteExpiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000),
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'REGENERATE_ADMIN_INVITE',
      targetId: email,
    },
  });

  revalidatePath('/hq/admins');
  return { success: true, inviteUrl: `${getAppUrl()}/admin-setup/${token}` };
}

export async function removeAdmin(email: string) {
  const admin = await requireAdmin(); // SECURITY CHECK

  // Both guards prevent an unrecoverable lockout — with no admin left, or no
  // way back into your own account, HQ is reachable only via direct database
  // access.
  if (admin.email === email) {
    return { success: false, error: 'You cannot remove your own admin account' };
  }

  const remaining = await prisma.globalAdmin.count({
    where: { passwordHash: { not: null } },
  });
  const target = await prisma.globalAdmin.findUnique({ where: { email } });

  if (target?.passwordHash && remaining <= 1) {
    return { success: false, error: 'Cannot remove the last active admin' };
  }

  await prisma.globalAdmin.delete({ where: { email } });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'REMOVE_ADMIN',
      targetId: email,
    },
  });

  revalidatePath('/hq/admins');
  return { success: true };
}
