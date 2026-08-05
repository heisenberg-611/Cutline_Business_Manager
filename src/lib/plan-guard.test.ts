import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  business: { findUnique: vi.fn() },
  globalSettings: { findUnique: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const mockUpdateOrganization = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({
    organizations: {
      updateOrganization: (...args: unknown[]) => mockUpdateOrganization(...args),
    },
  }),
}))

const { requirePlan, getActivePlanFor, syncClerkSeatCap, PlanRequiredError } =
  await import('./plan-guard')

const ORG = 'org_1'

/** A business on `plan`, whose paid period ends `days` from now (null = none). */
function business(plan: string, days: number | null = null) {
  const end = days === null ? null : new Date(Date.now() + days * 86_400_000)
  mockPrisma.business.findUnique.mockResolvedValue({
    subscriptionPlan: plan,
    subscriptionPeriodEnd: end,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.globalSettings.findUnique.mockResolvedValue({ businessTierSeatLimit: 25 })
})

describe('requirePlan', () => {
  it('allows a Business plan through every gate', async () => {
    business('BUSINESS', 30)
    for (const feature of ['emails', 'feedback', 'prodp', 'members', 'messages', 'collaboration'] as const) {
      await expect(requirePlan(ORG, feature)).resolves.toBe('BUSINESS')
    }
  })

  it('allows Pro the Pro features and refuses the Business-only ones', async () => {
    business('PRO', 30)

    for (const feature of ['emails', 'feedback', 'prodp'] as const) {
      await expect(requirePlan(ORG, feature)).resolves.toBe('PRO')
    }
    for (const feature of ['members', 'messages', 'collaboration'] as const) {
      await expect(requirePlan(ORG, feature)).rejects.toThrow(PlanRequiredError)
    }
  })

  it('refuses every paid feature on Free', async () => {
    business('FREE')
    for (const feature of ['emails', 'feedback', 'prodp', 'members', 'messages', 'collaboration'] as const) {
      await expect(requirePlan(ORG, feature)).rejects.toThrow(PlanRequiredError)
    }
  })

  it('treats an expired paid plan as Free', async () => {
    // The bug this guards: reading subscriptionPlan directly would still say
    // BUSINESS here and hand over every feature for free.
    business('BUSINESS', -1)

    await expect(requirePlan(ORG, 'members')).rejects.toThrow(PlanRequiredError)
    await expect(requirePlan(ORG, 'emails')).rejects.toThrow(PlanRequiredError)
    await expect(getActivePlanFor(ORG)).resolves.toBe('FREE')
  })

  it('honours an admin override of no expiry as indefinite access', async () => {
    business('BUSINESS', null)
    await expect(requirePlan(ORG, 'members')).resolves.toBe('BUSINESS')
  })

  it('fails closed when the business does not exist', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(null)

    await expect(getActivePlanFor(ORG)).resolves.toBe('FREE')
    await expect(requirePlan(ORG, 'messages')).rejects.toThrow(PlanRequiredError)
  })

  it('reports the feature and plan on the error', async () => {
    business('FREE')

    await expect(requirePlan(ORG, 'members')).rejects.toMatchObject({
      feature: 'members',
      plan: 'FREE',
      message: expect.stringContaining('Business plan'),
    })
  })
})

describe('syncClerkSeatCap', () => {
  it('uses the configured seat limit for Business', async () => {
    await syncClerkSeatCap(ORG, 'BUSINESS')
    expect(mockUpdateOrganization).toHaveBeenCalledWith(ORG, { maxAllowedMemberships: 25 })
  })

  it('honours a changed seat limit without a redeploy', async () => {
    mockPrisma.globalSettings.findUnique.mockResolvedValue({ businessTierSeatLimit: 10 })

    await syncClerkSeatCap(ORG, 'BUSINESS')
    expect(mockUpdateOrganization).toHaveBeenCalledWith(ORG, { maxAllowedMemberships: 10 })
  })

  it('falls back to 25 when no settings row exists', async () => {
    // Must not fall back to 0, which Clerk reads as unlimited — that would
    // hand out more seats than the instance allows on a missing settings row.
    mockPrisma.globalSettings.findUnique.mockResolvedValue(null)

    await syncClerkSeatCap(ORG, 'BUSINESS')
    expect(mockUpdateOrganization).toHaveBeenCalledWith(ORG, { maxAllowedMemberships: 25 })
  })

  it('leaves room for the owner alone below Business', async () => {
    for (const plan of ['FREE', 'PRO'] as const) {
      mockUpdateOrganization.mockClear()
      await syncClerkSeatCap(ORG, plan)
      expect(mockUpdateOrganization).toHaveBeenCalledWith(ORG, { maxAllowedMemberships: 1 })
    }
  })

  it('swallows a Clerk failure so billing flows never break on an outage', async () => {
    // A failed sync is recoverable — the webhook backstop still refuses the
    // membership. A thrown error here would fail the customer's upgrade.
    mockUpdateOrganization.mockRejectedValue(new Error('Clerk unreachable'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(syncClerkSeatCap(ORG, 'FREE')).resolves.toBeUndefined()
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })
})
