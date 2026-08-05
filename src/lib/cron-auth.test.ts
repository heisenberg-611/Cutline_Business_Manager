import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isAuthorizedCron } from './cron-auth'
import type { NextRequest } from 'next/server'

const SECRET = 'a-sufficiently-long-cron-secret-value'

/** Minimal stand-in: isAuthorizedCron only reads the authorization header. */
function req(authorization?: string): NextRequest {
  return {
    headers: { get: (name: string) => (name === 'authorization' ? authorization ?? null : null) },
  } as unknown as NextRequest
}

beforeEach(() => {
  process.env.CRON_SECRET = SECRET
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isAuthorizedCron', () => {
  it('accepts the correct bearer token', () => {
    expect(isAuthorizedCron(req(`Bearer ${SECRET}`))).toBe(true)
  })

  it('rejects a wrong or missing token', () => {
    expect(isAuthorizedCron(req('Bearer wrong'))).toBe(false)
    expect(isAuthorizedCron(req(undefined))).toBe(false)
    expect(isAuthorizedCron(req(''))).toBe(false)
    expect(isAuthorizedCron(req(SECRET))).toBe(false) // missing the scheme
  })

  it('rejects "Bearer undefined" when no secret is set', () => {
    // The original check interpolated an unset variable, so this exact header
    // authenticated successfully.
    delete process.env.CRON_SECRET
    expect(isAuthorizedCron(req('Bearer undefined'))).toBe(false)
  })

  it('refuses everything when the secret is missing, rather than skipping the check', () => {
    // The other original check short-circuited on a falsy secret and let every
    // request through.
    delete process.env.CRON_SECRET
    expect(isAuthorizedCron(req(`Bearer ${SECRET}`))).toBe(false)
    expect(isAuthorizedCron(req('anything'))).toBe(false)
  })

  it('refuses a secret too short to be meaningful', () => {
    process.env.CRON_SECRET = 'short'
    expect(isAuthorizedCron(req('Bearer short'))).toBe(false)
  })
})
