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

/**
 * Bounds for the operator-editable security settings.
 *
 * Enforced when reading as well as when writing. A stored value outside these
 * bounds is not merely odd, it is dangerous: a negative maxFailedLogins makes
 * `attempts >= threshold` true on the very first failure, locking an admin out
 * on one mistyped password with no way back in except direct database access.
 */
export const MAX_FAILED_LOGINS = { min: 1, max: 50, fallback: 5 } as const;
export const SESSION_TIMEOUT_MINUTES = { min: 1, max: 1440, fallback: 15 } as const;

/**
 * Coerces a stored setting into its usable range.
 *
 * Note this treats 0 as out of range rather than falsy. The previous
 * `settings?.maxFailedLogins || 5` silently turned a configured 0 into 5, so
 * the panel showed one number while the system used another.
 */
export function clampSetting(
  value: number | null | undefined,
  range: { min: number; max: number; fallback: number }
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return range.fallback;
  return Math.min(Math.max(Math.trunc(value), range.min), range.max);
}
