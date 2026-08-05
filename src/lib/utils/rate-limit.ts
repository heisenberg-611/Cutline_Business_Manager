import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

/**
 * Rate limiting, backed by Upstash Redis.
 *
 * Redis rather than in-process counters because the app runs across many
 * serverless instances, and a limit is only a limit if every instance sees the
 * same tally.
 *
 * Two distinct failure modes, deliberately handled differently:
 *
 * - Not configured (no UPSTASH_* variables): limiters stay null and the checks
 *   do nothing. Logged loudly in production, because silence here is how it
 *   went unnoticed that the public endpoints had no throttle at all.
 *
 * - Configured but erroring (outage, network blip, out-of-memory with eviction
 *   disabled): the request is allowed through. A limiter is a safeguard, not a
 *   dependency — an infrastructure blip must not take a customer's public
 *   feedback form offline. An actual limit breach is still enforced; only
 *   errors reaching Redis fail open.
 */

function isConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function warnUnconfigured(scope: string) {
  const message = `[rate-limit] Upstash Redis not configured — ${scope} is UNTHROTTLED.`;
  // An error in production: unthrottled public endpoints are a real exposure,
  // not a development convenience.
  if (process.env.NODE_ENV === "production") console.error(message);
  else console.warn(message);
}

/**
 * Runs a limiter, translating an unreachable Redis into "allowed".
 * Returns true when the caller should proceed.
 */
async function allow(
  limiter: Ratelimit | null,
  key: string,
  scope: string
): Promise<{ allowed: boolean; reset?: number }> {
  if (!limiter) return { allowed: true };

  try {
    const { success, reset } = await limiter.limit(key);
    return { allowed: success, reset };
  } catch (error) {
    console.error(`[rate-limit] ${scope} check failed, allowing request:`, error);
    return { allowed: true };
  }
}

// -----------------------------------------------------------------------------
// PUBLIC ACTION RATE LIMITER
// -----------------------------------------------------------------------------
let publicActionLimiter: Ratelimit | null = null;

try {
  if (isConfigured()) {
    publicActionLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
    });
  } else {
    warnUnconfigured("public form submissions (intake, feedback, review notes)");
  }
} catch (error) {
  console.error("[rate-limit] Failed to initialize Upstash Redis:", error);
}

export async function checkRateLimit() {
  if (!publicActionLimiter) return;

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "anonymous";

  const { allowed } = await allow(publicActionLimiter, `ratelimit_${ip}`, "public");
  if (!allowed) {
    throw new Error("Too many requests. Please try again later.");
  }
}

// -----------------------------------------------------------------------------
// USER MESSAGING RATE LIMITER
// -----------------------------------------------------------------------------
let messageActionLimiter: Ratelimit | null = null;

try {
  if (isConfigured()) {
    messageActionLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      // Max 30 messages per 1 minute per user
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
    });
  }
} catch (error) {
  console.error("[rate-limit] Failed to initialize Upstash Redis for messaging:", error);
}

export async function checkMessageRateLimit(userId: string) {
  if (!messageActionLimiter) return;

  const { allowed } = await allow(
    messageActionLimiter,
    `msg_ratelimit_${userId}`,
    "messaging"
  );
  if (!allowed) {
    throw new Error("You are sending messages too quickly. Please wait a moment.");
  }
}

// -----------------------------------------------------------------------------
// ADMIN AUTH RATE LIMITER
// -----------------------------------------------------------------------------
let adminAuthLimiter: Ratelimit | null = null;

try {
  if (isConfigured()) {
    adminAuthLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      // Max 5 attempts per 5 minutes
      limiter: Ratelimit.slidingWindow(5, "5 m"),
      analytics: true,
    });
  }
} catch (error) {
  console.error("[rate-limit] Failed to initialize Upstash Redis for admin auth:", error);
}

/**
 * Failing open here is safe in a way it would not be on its own: admin login is
 * also protected by a per-account lockout in the database, which counts
 * failures and locks at GlobalSettings.maxFailedLogins regardless of Redis.
 */
export async function checkAdminAuthRateLimit(ip: string) {
  if (!adminAuthLimiter) return { success: true };

  const { allowed, reset } = await allow(adminAuthLimiter, `admin_auth_${ip}`, "admin auth");

  if (!allowed) {
    const minutes = Math.max(1, Math.ceil(((reset ?? Date.now()) - Date.now()) / 1000 / 60));
    return {
      success: false,
      error: `Too many login attempts. Please try again after ${minutes} minutes.`,
    };
  }

  return { success: true };
}
