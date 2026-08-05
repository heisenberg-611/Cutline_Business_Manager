import { createHash } from 'crypto';

/**
 * Shared constants and helpers for HQ admin authentication.
 *
 * A plain module rather than part of either actions file: a 'use server' module
 * may only export async functions, so constants shared between the invite flow
 * and the login flow have to live outside both.
 */

/** How long an unaccepted invite stays valid. */
export const INVITE_TTL_HOURS = 72;

/** How long an account stays locked once the failure threshold is reached. */
export const LOCKOUT_MINUTES = 15;

/**
 * Shortest master password accepted. Deliberately longer than a tenant
 * password: this one can force any plan and export every user's data.
 */
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

/**
 * Invite tokens are looked up by value, so they are stored as a SHA-256 rather
 * than bcrypt: read access to global_admins must not be replayable into admin
 * access, but the lookup still has to be a single indexed query. The token is
 * 32 random bytes, so it is not brute-forceable and does not need a slow hash.
 */
export function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
