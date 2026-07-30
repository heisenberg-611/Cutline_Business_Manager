/*
  Warnings:

  - You are about to drop the column `cost` on the `assets` table. All the data in the column will be lost.
  - The `sourceType` column on the `invoice_line_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `assets` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('Music');

-- CreateEnum
CREATE TYPE "LineItemSourceType" AS ENUM ('manual');

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_clientId_fkey";

-- AlterTable
ALTER TABLE "assets" RENAME COLUMN "cost" TO "costCents";
ALTER TABLE "assets" ALTER COLUMN "type" TYPE "AssetType" USING "type"::"AssetType";

-- AlterTable
ALTER TABLE "invoice_line_items" ALTER COLUMN "sourceType" DROP DEFAULT;
ALTER TABLE "invoice_line_items" ALTER COLUMN "sourceType" TYPE "LineItemSourceType" USING "sourceType"::"LineItemSourceType";
ALTER TABLE "invoice_line_items" ALTER COLUMN "sourceType" SET DEFAULT 'manual';



-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
