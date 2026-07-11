import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const businesses = await prisma.business.findMany({
    include: {
      projects: {
        include: { statusStage: true, client: true }
      }
    }
  });

  if (businesses.length === 0) {
    console.log("No businesses found in the database.");
    return;
  }

  businesses.forEach(business => {
    console.log(`\n🏢 Business: ${business.name} (ID: ${business.id})`);
    
    if (business.projects.length === 0) {
      console.log("  No projects found for this business.");
      return;
    }

    business.projects.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.isArchived ? 'ARCHIVED' : 'ACTIVE'}] ${p.title} - Stage: ${p.statusStage?.name || 'None'} - Client: ${p.client?.displayName}`);
    });
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
