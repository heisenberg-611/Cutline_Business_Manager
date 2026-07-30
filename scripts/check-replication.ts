import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const dbs = [
  { name: 'Supabase', url: process.env.DIRECT_URL },
  { name: 'Neon', url: process.env.NEON_DIRECT_URL },
  { name: 'Aiven', url: process.env.AIVEN_DIRECT_URL }
];

async function checkDb(name: string, url: string | undefined) {
  if (!url) {
    console.log(`\n--- ${name} ---`);
    console.log(`No URL found in env.`);
    return;
  }
  const prisma = new PrismaClient({
    datasources: { db: { url } }
  });
  
  try {
    console.log(`\n--- ${name} ---`);
    
    const pubs = await prisma.$queryRawUnsafe<any[]>(`SELECT pubname, puballtables FROM pg_publication;`);
    console.log('PUBLICATIONS:', pubs);
    
    const pubTables = await prisma.$queryRawUnsafe<any[]>(`SELECT pubname, schemaname, tablename FROM pg_publication_tables;`);
    console.log('PUBLICATION TABLES:', pubTables);
    
    const subs = await prisma.$queryRawUnsafe<any[]>(`SELECT subname, subpublications FROM pg_subscription;`);
    console.log('SUBSCRIPTIONS:', subs);
    
  } catch(e: any) {
    console.error(`Error querying ${name}:`, e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  for (const db of dbs) {
    await checkDb(db.name, db.url);
  }
}

main().catch(console.error);
