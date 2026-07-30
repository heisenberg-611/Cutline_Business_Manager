import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.zvgqgtdpejmlniidxygx:oYwZXWaUAZl6has9@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
    }
  }
})

async function main() {
  try {
    const assets = await prisma.$queryRawUnsafe(`SELECT DISTINCT type FROM assets;`);
    console.log('--- ASSETS ---');
    console.log(assets);

    const sourceTypes = await prisma.$queryRawUnsafe(`SELECT DISTINCT "sourceType" FROM invoice_line_items;`);
    console.log('--- SOURCE TYPES ---');
    console.log(sourceTypes);

    const publications = await prisma.$queryRawUnsafe(`SELECT * FROM pg_publication;`);
    console.log('--- PUBLICATIONS ---');
    console.log(publications);

    const pubTables = await prisma.$queryRawUnsafe(`SELECT * FROM pg_publication_tables;`);
    console.log('--- PUBLICATION TABLES ---');
    console.log(pubTables);
  } catch(e) {
    console.error(e)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
