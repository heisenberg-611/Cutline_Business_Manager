import { describe, it, expect } from 'vitest'
import { restorablePlan, planRank, PLANS } from './subscription'

const future = () => new Date(Date.now() + 10 * 86_400_000)
const past = () => new Date(Date.now() - 86_400_000)

describe('planRank', () => {
  it('orders the tiers', () => {
    expect(planRank(PLANS.FREE)).toBeLessThan(planRank(PLANS.PRO))
    expect(planRank(PLANS.PRO)).toBeLessThan(planRank(PLANS.BUSINESS))
  })
})

describe('restorablePlan', () => {
  it('offers Business back to a customer who downgraded to Pro mid-period', () => {
    expect(restorablePlan({
      subscriptionPlan: PLANS.PRO,
      purchasedPlan: PLANS.BUSINESS,
      subscriptionPeriodEnd: future(),
    })).toBe(PLANS.BUSINESS)
  })

  it('offers nothing once the paid period has ended', () => {
    // The entitlement lasts exactly as long as what was paid for.
    expect(restorablePlan({
      subscriptionPlan: PLANS.PRO,
      purchasedPlan: PLANS.BUSINESS,
      subscriptionPeriodEnd: past(),
    })).toBeNull()
  })

  it('offers nothing when nothing was purchased', () => {
    expect(restorablePlan({
      subscriptionPlan: PLANS.FREE,
      purchasedPlan: null,
      subscriptionPeriodEnd: future(),
    })).toBeNull()
  })

  it('offers nothing when already on the purchased plan', () => {
    expect(restorablePlan({
      subscriptionPlan: PLANS.BUSINESS,
      purchasedPlan: PLANS.BUSINESS,
      subscriptionPeriodEnd: future(),
    })).toBeNull()
  })

  it('never lets a restore become an upgrade', () => {
    // Only Pro was bought, so Business is not on offer at any point.
    expect(restorablePlan({
      subscriptionPlan: PLANS.FREE,
      purchasedPlan: PLANS.PRO,
      subscriptionPeriodEnd: future(),
    })).toBe(PLANS.PRO)

    expect(restorablePlan({
      subscriptionPlan: PLANS.PRO,
      purchasedPlan: PLANS.PRO,
      subscriptionPeriodEnd: future(),
    })).toBeNull()
  })

  it('offers nothing after an HQ admin reduces the plan', () => {
    // forceUpdateSubscription lowers purchasedPlan alongside subscriptionPlan,
    // so an administratively reduced plan cannot be self-restored. This is the
    // escalation the old request-history check tried, and failed, to prevent.
    expect(restorablePlan({
      subscriptionPlan: PLANS.PRO,
      purchasedPlan: PLANS.PRO,
      subscriptionPeriodEnd: future(),
    })).toBeNull()
  })

  it('offers nothing with no period recorded', () => {
    expect(restorablePlan({
      subscriptionPlan: PLANS.PRO,
      purchasedPlan: PLANS.BUSINESS,
      subscriptionPeriodEnd: null,
    })).toBeNull()
  })
})
