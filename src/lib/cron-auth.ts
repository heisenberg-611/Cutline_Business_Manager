import { NextRequest } from 'next/server'

/**
 * Authorises a scheduled job request.
 *
 * Both original call sites failed open, in different ways:
 *
 *   authHeader !== `Bearer ${process.env.CRON_SECRET}`
 * compares against the literal "Bearer undefined" when the variable is unset,
 * so sending exactly that header passed.
 *
 *   process.env.CRON_SECRET && authHeader !== `Bearer ${...}`
 * short-circuits to false when the variable is unset, skipping the check
 * altogether and leaving the endpoint public.
 *
 * A missing secret is a misconfiguration, not permission. This refuses.
 */
export function isAuthorizedCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET

  if (!secret || secret.length < 16) {
    console.error('[cron] CRON_SECRET is missing or too short — refusing the request')
    return false
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  const expected = `Bearer ${secret}`
  if (authHeader.length !== expected.length) return false

  // Constant-time: these run on a public URL and are worth guessing at.
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= authHeader.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}
