-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "hasUsedFreeTrial" BOOLEAN NOT NULL DEFAULT false;

-- Backfill. Without this every existing business starts at false, so the very
-- loophole this column closes would stay open for exactly the businesses that
-- have already been through a trial.
--
-- A business counts as having used its trial if any of its members has consumed
-- their personal one, since the trial always upgraded the workspace rather than
-- the individual.
UPDATE "businesses" b
SET "hasUsedFreeTrial" = true
WHERE EXISTS (
  SELECT 1
  FROM "business_memberships" m
  JOIN "users" u ON u."id" = m."userId"
  WHERE m."businessId" = b."id"
    AND u."hasUsedFreeTrial" = true
);
