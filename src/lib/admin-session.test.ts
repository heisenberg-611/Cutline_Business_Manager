import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  signAdminSession,
  verifyAdminSessionCookie,
  hasAdminSecret,
} from './admin-session'

const SECRET = 'a-sufficiently-long-test-secret-of-at-least-32-chars'

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = SECRET
})

afterEach(() => {
  process.env.ADMIN_SESSION_SECRET = SECRET
})

describe('admin session signing', () => {
  it('round-trips a session it issued', async () => {
    const cookie = await signAdminSession('admin@test.local', 900)
    const payload = await verifyAdminSessionCookie(cookie)

    expect(payload?.email).toBe('admin@test.local')
    expect(payload!.exp).toBeGreaterThan(payload!.iat)
  })

  it('does not put the email in the clear', async () => {
    // The old cookie WAS the email. Base64 is not secrecy, but the point is
    // that the value is no longer a bare identifier anyone can type.
    const cookie = await signAdminSession('admin@test.local', 900)
    expect(cookie).not.toContain('admin@test.local')
    expect(cookie.split('.')).toHaveLength(2)
  })

  it('rejects a forged cookie', async () => {
    // Exactly the old attack: assert an email and expect to be believed.
    const forged = btoa(JSON.stringify({ email: 'admin@test.local', iat: 1, exp: 9_999_999_999 }))
    expect(await verifyAdminSessionCookie(forged)).toBeNull()
    expect(await verifyAdminSessionCookie(`${forged}.not-a-real-signature`)).toBeNull()
  })

  it('rejects a tampered payload', async () => {
    const cookie = await signAdminSession('nobody@test.local', 900)
    const signature = cookie.split('.')[1]
    const swapped = btoa(JSON.stringify({ email: 'admin@test.local', iat: 1, exp: 9_999_999_999 }))

    expect(await verifyAdminSessionCookie(`${swapped}.${signature}`)).toBeNull()
  })

  it('rejects a cookie signed with a different secret', async () => {
    const cookie = await signAdminSession('admin@test.local', 900)

    process.env.ADMIN_SESSION_SECRET = 'a-completely-different-secret-value-also-32-plus-chars'
    expect(await verifyAdminSessionCookie(cookie)).toBeNull()
  })

  it('rejects an expired cookie', async () => {
    const cookie = await signAdminSession('admin@test.local', -1)
    expect(await verifyAdminSessionCookie(cookie)).toBeNull()
  })

  it('rejects empty and malformed values', async () => {
    for (const value of [undefined, '', 'nodot', '.', 'a.b.c.d']) {
      expect(await verifyAdminSessionCookie(value as string | undefined)).toBeNull()
    }
  })

  it('fails closed when the secret is missing or too short', async () => {
    const cookie = await signAdminSession('admin@test.local', 900)

    delete process.env.ADMIN_SESSION_SECRET
    expect(hasAdminSecret()).toBe(false)
    // Must not admit the cookie just because it cannot be checked.
    expect(await verifyAdminSessionCookie(cookie)).toBeNull()
    await expect(signAdminSession('admin@test.local', 900)).rejects.toThrow('ADMIN_SESSION_SECRET')

    process.env.ADMIN_SESSION_SECRET = 'tooshort'
    expect(hasAdminSecret()).toBe(false)
    expect(await verifyAdminSessionCookie(cookie)).toBeNull()
  })
})
