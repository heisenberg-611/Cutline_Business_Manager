-- AlterTable
ALTER TABLE "subscription_requests" ADD COLUMN     "paidAt" TIMESTAMP(3);


-- Backfill from the approval timestamp, which is the closest record of when the
-- money was recognised. Uses updatedAt because that is when the row was moved to
-- APPROVED; pinning it now is what stops it drifting on any later edit.
UPDATE "subscription_requests"
SET "paidAt" = "updatedAt"
WHERE "status" = 'APPROVED' AND "paidAt" IS NULL;
