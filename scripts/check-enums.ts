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
