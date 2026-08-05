-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "purchasedPlan" "SubscriptionPlan";

-- Backfill, in two passes.
--
-- Pass 1: anyone on a paid plan is entitled to at least that plan. FREE stays
-- NULL — there is no purchase to record, and NULL is what correctly makes
-- restore unavailable to them.
UPDATE "businesses"
SET "purchasedPlan" = "subscriptionPlan"
WHERE "subscriptionPlan" <> 'FREE';

-- Pass 2: a business sitting on PRO with an approved BUSINESS request inside a
-- still-active period is one that voluntarily downgraded. Its entitlement is
-- BUSINESS, not the PRO it is currently using — without this it would lose the
-- restore it paid for.
--
-- admin_override is intentionally included: payment is taken manually and
-- fulfilled by an HQ admin setting the plan, so those rows record real sales.
UPDATE "businesses" b
SET "purchasedPlan" = 'BUSINESS'
WHERE b."subscriptionPlan" = 'PRO'
  AND b."subscriptionPeriodEnd" IS NOT NULL
  AND b."subscriptionPeriodEnd" > NOW()
  AND EXISTS (
    SELECT 1
    FROM "subscription_requests" r
    WHERE r."businessId" = b."id"
      AND r."status" = 'APPROVED'
      AND r."planRequested" = 'BUSINESS'
  );
