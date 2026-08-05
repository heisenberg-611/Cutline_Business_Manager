-- DropForeignKey
ALTER TABLE "subscription_requests" DROP CONSTRAINT "subscription_requests_businessId_fkey";

-- AlterTable
ALTER TABLE "subscription_requests" ALTER COLUMN "businessId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "subscription_requests" ADD CONSTRAINT "subscription_requests_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

