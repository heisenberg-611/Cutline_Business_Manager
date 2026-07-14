import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

// Note: If UPSTASH_REDIS_REST_URL is missing, it will throw.
// We fallback to a mock limiter if Redis isn't configured in dev, 
// to prevent breaking the app if the user hasn't set it up yet.

let publicActionLimiter: Ratelimit | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    publicActionLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, "1 m"),
      analytics: true,
    });
  } else {
    console.warn("Upstash Redis not configured. Rate limiting is disabled.");
  }
} catch (error) {
  console.warn("Failed to initialize Upstash Redis:", error);
}

export async function checkRateLimit() {
  if (!publicActionLimiter) return;

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for") ?? "anonymous";
  
  const { success } = await publicActionLimiter.limit(`ratelimit_${ip}`);
  if (!success) {
    throw new Error("Too many requests. Please try again later.");
  }
}

// -----------------------------------------------------------------------------
// USER MESSAGING RATE LIMITER
// -----------------------------------------------------------------------------
let messageActionLimiter: Ratelimit | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    messageActionLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      // Max 30 messages per 1 minute per user
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
    });
  }
} catch (error) {
  console.warn("Failed to initialize Upstash Redis for messaging:", error);
}

export async function checkMessageRateLimit(userId: string) {
  if (!messageActionLimiter) return;
  
  const { success } = await messageActionLimiter.limit(`msg_ratelimit_${userId}`);
  if (!success) {
    throw new Error("You are sending messages too quickly. Please wait a moment.");
  }
}
