/**
 * Script: check-enums.ts
 * Purpose: Queries the dev database to find all distinct values currently in use 
 *          for string fields that we planned to convert into PostgreSQL enums 
 *          (`Asset.type` and `InvoiceLineItem.sourceType`).
 * 
 * Why this exists:
 * - Before promoting a loose string column to a strict ENUM, we needed to prove 
 *   that all existing data matched the proposed enum values precisely. 
 * - If there was a single typo (e.g. "music" instead of "Music"), the Postgres 
 *   enum cast (`USING type::"AssetType"`) would crash the migration.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const assetTypes = await prisma.asset.findMany({
    select: { type: true },
    distinct: ['type']
  });
  console.log('Asset Types:', assetTypes.map(a => a.type));

  const sourceTypes = await prisma.invoiceLineItem.findMany({
    select: { sourceType: true },
    distinct: ['sourceType']
  });
  console.log('Source Types:', sourceTypes.map(s => s.sourceType));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
