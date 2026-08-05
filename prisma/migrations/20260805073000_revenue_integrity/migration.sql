-- AlterEnum
ALTER TYPE "SubscriptionRequestStatus" ADD VALUE 'VOIDED';

-- AlterTable
ALTER TABLE "subscription_requests" ADD COLUMN     "amountPaid" INTEGER;


-- Backfill at the prices currently in PLAN_PRICES, which is exactly what the
-- finances page was already computing. This deliberately freezes today's
-- reported figures rather than changing them: the point is that they stop
-- moving when a price changes, not that they take on new values now.
UPDATE "subscription_requests"
SET "amountPaid" = CASE "planRequested"
  WHEN 'BUSINESS' THEN 299
  WHEN 'PRO' THEN 99
  ELSE 0
END
WHERE "status" = 'APPROVED' AND "amountPaid" IS NULL;
