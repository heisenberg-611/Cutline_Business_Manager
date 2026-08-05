-- CreateEnum
CREATE TYPE "AccountDeletionStatus" AS ENUM ('AWAITING_DATA', 'DATA_DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "account_deletion_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "reason" TEXT NOT NULL,
    "status" "AccountDeletionStatus" NOT NULL DEFAULT 'AWAITING_DATA',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataDeliveredAt" TIMESTAMP(3),
    "deliveredBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_deletion_requests_status_idx" ON "account_deletion_requests"("status");

-- CreateIndex
CREATE INDEX "account_deletion_requests_userId_idx" ON "account_deletion_requests"("userId");

