import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRequireAdmin = vi.fn()
vi.mock('@/lib/auth', () => ({
  requireAdmin: (...a: unknown[]) => mockRequireAdmin(...a),
}))

const mockPrisma = {
  business: { findUnique: vi.fn(), update: vi.fn() },
  subscriptionRequest: { findFirst: vi.fn() },
  upgradeRequest: { create: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/admin-notifications', () => ({ createAdminNotification: vi.fn() }))

const mockSyncClerkSeatCap = vi.fn()
vi.mock('@/lib/plan-guard', () => ({
  syncClerkSeatCap: (...a: unknown[]) => mockSyncClerkSeatCap(...a),
}))

const { restoreBusinessPlan, cancelSubscription } = await import('./actions')

const ORG = 'org_1'
const FUTURE = new Date(Date.now() + 10 * 86_400_000)

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ userId: 'user_admin', orgId: ORG, orgRole: 'org:admin' })
})

describe('billing actions require an admin', () => {
  it('refuses cancelSubscription for a non-admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Forbidden: Admins only'))

    await expect(cancelSubscription()).rejects.toThrow('Forbidden: Admins only')
    expect(mockPrisma.business.update).not.toHaveBeenCalled()
  })
})

describe('restoreBusinessPlan', () => {
  it('restores a self-downgraded Pro plan backed by a real payment', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      subscriptionPlan: 'PRO',
      subscriptionPeriodEnd: FUTURE,
    })
    mockPrisma.subscriptionRequest.findFirst.mockResolvedValue({
      planRequested: 'BUSINESS',
      paymentMethod: 'bkash',
    })

    await restoreBusinessPlan()

    expect(mockPrisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { subscriptionPlan: 'BUSINESS' } })
    )
    expect(mockSyncClerkSeatCap).toHaveBeenCalledWith(ORG, 'BUSINESS')
  })

  it('accepts an HQ-granted Business plan as proof of purchase', async () => {
    // Payment is manual (bKash) and fulfilled by an HQ admin setting the plan,
    // so admin_override is how most real sales are recorded here. Filtering it
    // out denied restore to genuine customers while the billing page, which
    // does not filter, still showed them the button.
    mockPrisma.business.findUnique.mockResolvedValue({
      subscriptionPlan: 'PRO',
      subscriptionPeriodEnd: FUTURE,
    })
    mockPrisma.subscriptionRequest.findFirst.mockResolvedValue({
      planRequested: 'BUSINESS',
      paymentMethod: 'admin_override',
    })

    await restoreBusinessPlan()

    expect(mockPrisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { subscriptionPlan: 'BUSINESS' } })
    )
  })

  it('refuses to climb from Free, which is not a self-downgrade', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      subscriptionPlan: 'FREE',
      subscriptionPeriodEnd: FUTURE,
    })

    await expect(restoreBusinessPlan()).rejects.toThrow('self-downgraded Pro plan')
    expect(mockPrisma.business.update).not.toHaveBeenCalled()
  })

  it('refuses once the paid period has lapsed', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      subscriptionPlan: 'PRO',
      subscriptionPeriodEnd: new Date(Date.now() - 86_400_000),
    })

    await expect(restoreBusinessPlan()).rejects.toThrow('No active subscription period')
    expect(mockPrisma.business.update).not.toHaveBeenCalled()
  })
})
