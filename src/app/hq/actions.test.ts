import { describe, it, expect, vi, beforeEach } from 'vitest'

// Signing needs a secret, and the module fails closed without one.
process.env.ADMIN_SESSION_SECRET = 'a-sufficiently-long-test-secret-of-at-least-32-chars'

const mockPrisma = {
  globalAdmin: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn(), count: vi.fn(), delete: vi.fn() },
  globalSettings: { findUnique: vi.fn() },
  adminAuditLog: { create: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const mockSet = vi.fn()
/**
 * Drives requireAdmin. Holds a genuinely signed cookie rather than a bare
 * email — verifyAdminSession now rejects anything it did not sign, which is
 * the whole point of the change.
 */
let sessionCookie: string | undefined
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: () => (sessionCookie ? { value: sessionCookie } : undefined),
    set: mockSet,
    delete: vi.fn(),
  }),
  headers: async () => new Map([['x-forwarded-for', '1.2.3.4']]),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockRateLimit = vi.fn()
vi.mock('@/lib/utils/rate-limit', () => ({
  checkAdminAuthRateLimit: (...a: unknown[]) => mockRateLimit(...a),
}))

vi.mock('@/lib/utils', () => ({ getAppUrl: () => 'https://app.test' }))

const mockCompare = vi.fn()
vi.mock('bcryptjs', () => ({
  default: { compare: (...a: unknown[]) => mockCompare(...a), hash: async () => 'hashed' },
}))

const { loginAdmin, addAdmin, removeAdmin } = await import('./actions')
const { signAdminSession } = await import('@/lib/admin-session')

/** Signs in as `email` for requireAdmin's benefit. */
async function asAdmin(email: string) {
  sessionCookie = await signAdminSession(email, 900)
}

/** The audit actions written during the call. */
const loggedActions = () => mockPrisma.adminAuditLog.create.mock.calls.map((c) => c[0].data.action)

beforeEach(() => {
  vi.clearAllMocks()
  sessionCookie = undefined
  mockRateLimit.mockResolvedValue({ success: true })
  mockPrisma.globalSettings.findUnique.mockResolvedValue({ maxFailedLogins: 5, sessionTimeoutMinutes: 15 })
  mockPrisma.adminAuditLog.create.mockResolvedValue({})
  mockPrisma.globalAdmin.update.mockResolvedValue({})
})

describe('loginAdmin — passwordless accounts', () => {
  it('refuses to sign in an invited account that has not set a password', async () => {
    // The original bug: this branch hashed whatever was submitted and saved it,
    // so anyone who knew an invited admin's email could claim the account.
    mockPrisma.globalAdmin.findUnique.mockResolvedValue({
      email: 'new@test.local',
      passwordHash: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    })

    const result = await loginAdmin('new@test.local', 'attacker-chosen-password')

    expect(result).toEqual({ success: false, error: 'Invalid credentials' })
    // Nothing written, no session issued.
    expect(mockPrisma.globalAdmin.update).not.toHaveBeenCalled()
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('gives the same error for an unknown email, so admins cannot be enumerated', async () => {
    mockPrisma.globalAdmin.findUnique.mockResolvedValue(null)

    await expect(loginAdmin('nobody@test.local', 'x')).resolves.toEqual({
      success: false,
      error: 'Invalid credentials',
    })
  })
})

describe('loginAdmin — account lockout', () => {
  const withAttempts = (failedLoginAttempts: number) => {
    mockPrisma.globalAdmin.findUnique.mockResolvedValue({
      email: 'admin@test.local',
      passwordHash: 'stored-hash',
      failedLoginAttempts,
      lockedUntil: null,
    })
  }

  it('counts a failed attempt without locking below the threshold', async () => {
    withAttempts(0)
    mockCompare.mockResolvedValue(false)

    await loginAdmin('admin@test.local', 'wrong')

    expect(mockPrisma.globalAdmin.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { failedLoginAttempts: 1, lockedUntil: null } })
    )
    expect(loggedActions()).toContain('ADMIN_LOGIN_FAILED')
  })

  it('locks the account on reaching maxFailedLogins', async () => {
    withAttempts(4) // fifth attempt hits the threshold of 5
    mockCompare.mockResolvedValue(false)

    const result = await loginAdmin('admin@test.local', 'wrong')

    expect(result.success).toBe(false)
    expect(result.error).toContain('locked')
    expect(mockPrisma.globalAdmin.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lockedUntil: expect.any(Date) }),
      })
    )
    expect(loggedActions()).toContain('ADMIN_LOGIN_LOCKED')
  })

  it('honours the configured threshold rather than a hardcoded one', async () => {
    // maxFailedLogins is editable in HQ and previously did nothing at all.
    mockPrisma.globalSettings.findUnique.mockResolvedValue({ maxFailedLogins: 2 })
    withAttempts(1)
    mockCompare.mockResolvedValue(false)

    const result = await loginAdmin('admin@test.local', 'wrong')

    expect(result.error).toContain('locked')
  })

  it('rejects a locked account without checking the password', async () => {
    mockPrisma.globalAdmin.findUnique.mockResolvedValue({
      email: 'admin@test.local',
      passwordHash: 'stored-hash',
      failedLoginAttempts: 0,
      lockedUntil: new Date(Date.now() + 10 * 60_000),
    })

    const result = await loginAdmin('admin@test.local', 'correct-password')

    expect(result.success).toBe(false)
    expect(mockCompare).not.toHaveBeenCalled()
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('clears the counter on a successful sign in', async () => {
    withAttempts(3)
    mockCompare.mockResolvedValue(true)

    const result = await loginAdmin('admin@test.local', 'correct')

    expect(result.success).toBe(true)
    expect(mockPrisma.globalAdmin.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { failedLoginAttempts: 0, lockedUntil: null } })
    )
    expect(mockSet).toHaveBeenCalled()
  })

  it('does not write when the counter is already clean', async () => {
    withAttempts(0)
    mockCompare.mockResolvedValue(true)

    await loginAdmin('admin@test.local', 'correct')

    expect(mockPrisma.globalAdmin.update).not.toHaveBeenCalled()
  })
})

describe('addAdmin', () => {
  beforeEach(async () => {
    await asAdmin('boss@test.local')
    mockPrisma.globalAdmin.findUnique.mockResolvedValue({
      email: 'boss@test.local',
      passwordHash: 'x',
    })
  })

  it('rejects a duplicate email', async () => {
    // Session lookup and duplicate check both resolve to an existing row.
    const result = await addAdmin('boss@test.local')

    expect(result).toEqual({ success: false, error: 'That email is already an admin' })
    expect(mockPrisma.globalAdmin.create).not.toHaveBeenCalled()
  })

  it('rejects a malformed email before touching the database', async () => {
    const result = await addAdmin('not-an-email')

    expect(result.success).toBe(false)
    expect(mockPrisma.globalAdmin.create).not.toHaveBeenCalled()
  })

  it('issues a one-time setup link and stores only its hash', async () => {
    mockPrisma.globalAdmin.findUnique
      .mockResolvedValueOnce({ email: 'boss@test.local', passwordHash: 'x' }) // session
      .mockResolvedValueOnce(null) // duplicate check
    mockPrisma.globalAdmin.create.mockResolvedValue({})

    const result = await addAdmin('new@test.local')

    expect(result.success).toBe(true)
    expect(result.inviteUrl).toMatch(/^https:\/\/app\.test\/admin-setup\/.+/)

    const created = mockPrisma.globalAdmin.create.mock.calls[0][0].data
    expect(created.passwordHash).toBeUndefined()
    expect(created.inviteTokenHash).toHaveLength(64) // sha256 hex

    // The raw token must never be persisted — only its hash.
    const rawToken = result.inviteUrl!.split('/').pop()!
    expect(created.inviteTokenHash).not.toBe(rawToken)
  })
})

describe('removeAdmin', () => {
  it('refuses to remove your own account', async () => {
    await asAdmin('boss@test.local')
    mockPrisma.globalAdmin.findUnique.mockResolvedValue({
      email: 'boss@test.local',
      passwordHash: 'x',
    })

    const result = await removeAdmin('boss@test.local')

    expect(result).toEqual({
      success: false,
      error: 'You cannot remove your own admin account',
    })
    expect(mockPrisma.globalAdmin.delete).not.toHaveBeenCalled()
  })

  it('refuses to remove the last active admin', async () => {
    await asAdmin('boss@test.local')
    mockPrisma.globalAdmin.findUnique.mockResolvedValue({
      email: 'boss@test.local',
      passwordHash: 'x',
    })
    mockPrisma.globalAdmin.count.mockResolvedValue(1)

    const result = await removeAdmin('other@test.local')

    expect(result.success).toBe(false)
    expect(mockPrisma.globalAdmin.delete).not.toHaveBeenCalled()
  })
})
