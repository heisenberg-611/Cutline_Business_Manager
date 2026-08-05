'use server';

import prisma from '@/modules/core/db/prisma';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { checkAdminAuthRateLimit } from '@/lib/utils/rate-limit';
import { MIN_ADMIN_PASSWORD_LENGTH, hashInviteToken } from '@/lib/admin-auth';

/**
 * Accepts an admin invite and sets the account's first password.
 *
 * Deliberately unauthenticated: the invitee is not an admin yet. The token is
 * the entire proof, which is why it is 32 random bytes, single-use, expiring,
 * and stored only as a hash.
 */
export async function acceptAdminInvite(token: string, password: string) {
  const headerList = await headers();
  const ip = headerList.get('x-forwarded-for') ?? 'anonymous';

  const rateLimit = await checkAdminAuthRateLimit(ip);
  if (!rateLimit.success) {
    return { success: false, error: rateLimit.error };
  }

  if (typeof password !== 'string' || password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`,
    };
  }

  const admin = await prisma.globalAdmin.findUnique({
    where: { inviteTokenHash: hashInviteToken(token) },
  });

  // One generic message for missing, expired, and already-used tokens, so this
  // endpoint cannot be used to probe which tokens exist.
  const INVALID = { success: false, error: 'This invite link is invalid or has expired' };

  if (!admin) return INVALID;
  if (admin.passwordHash) return INVALID;
  if (!admin.inviteExpiresAt || admin.inviteExpiresAt < new Date()) return INVALID;

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.globalAdmin.update({
    where: { id: admin.id },
    data: {
      passwordHash,
      // Consumed: the link cannot be replayed.
      inviteTokenHash: null,
      inviteExpiresAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'ADMIN_INVITE_ACCEPTED',
      targetId: admin.email,
      metadata: { ip },
    },
  });

  // No session is issued here on purpose — they sign in normally, which proves
  // the password was actually recorded.
  return { success: true, email: admin.email };
}

/** Whether to render the form or the expired notice, without leaking details. */
export async function checkInviteToken(token: string) {
  const admin = await prisma.globalAdmin.findUnique({
    where: { inviteTokenHash: hashInviteToken(token) },
    select: { email: true, passwordHash: true, inviteExpiresAt: true },
  });

  if (!admin || admin.passwordHash) return { valid: false as const };
  if (!admin.inviteExpiresAt || admin.inviteExpiresAt < new Date()) {
    return { valid: false as const };
  }

  return { valid: true as const, email: admin.email };
}
