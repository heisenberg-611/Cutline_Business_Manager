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
  it('returns a mid-period downgrader to the plan they purchased', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      subscriptionPlan: 'PRO',
      purchasedPlan: 'BUSINESS',
      subscriptionPeriodEnd: FUTURE,
    })

    await restoreBusinessPlan()

    expect(mockPrisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { subscriptionPlan: 'BUSINESS' } })
    )
    expect(mockSyncClerkSeatCap).toHaveBeenCalledWith(ORG, 'BUSINESS')
  })

  it('no longer consults subscription request history', async () => {
    // The whole class of bugs here came from inferring entitlement from past
    // requests: admin_override was indistinguishable from a sale, and the
    // most-recent-request lookup returned the wrong row for anyone who had
    // bought more than one plan.
    mockPrisma.business.findUnique.mockResolvedValue({
      subscriptionPlan: 'PRO',
      purchasedPlan: 'BUSINESS',
      subscriptionPeriodEnd: FUTURE,
    })

    await restoreBusinessPlan()

    expect(mockPrisma.subscriptionRequest.findFirst).not.toHaveBeenCalled()
  })

  it('refuses once the paid period has lapsed', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      subscriptionPlan: 'PRO',
      purchasedPlan: 'BUSINESS',
      subscriptionPeriodEnd: new Date(Date.now() - 86_400_000),
    })

    await expect(restoreBusinessPlan()).rejects.toThrow('no paid plan to restore')
    expect(mockPrisma.business.update).not.toHaveBeenCalled()
  })

  it('refuses when the plan was reduced by an HQ admin', async () => {
    // forceUpdateSubscription lowers purchasedPlan too, so there is nothing
    // left to climb back to.
    mockPrisma.business.findUnique.mockResolvedValue({
      subscriptionPlan: 'PRO',
      purchasedPlan: 'PRO',
      subscriptionPeriodEnd: FUTURE,
    })

    await expect(restoreBusinessPlan()).rejects.toThrow('no paid plan to restore')
    expect(mockPrisma.business.update).not.toHaveBeenCalled()
  })

  it('refuses when nothing was ever purchased', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      subscriptionPlan: 'FREE',
      purchasedPlan: null,
      subscriptionPeriodEnd: FUTURE,
    })

    await expect(restoreBusinessPlan()).rejects.toThrow('no paid plan to restore')
    expect(mockPrisma.business.update).not.toHaveBeenCalled()
  })
})
