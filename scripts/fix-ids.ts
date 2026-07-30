/**
 * Script: fix-ids.ts
 * Purpose: A one-off script to retroactively assign human-readable `displayId`s 
 *          (e.g., CL-001, PRJ-001) to existing clients and projects that were 
 *          created before the sequence numbering system was introduced.
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const businesses = await prisma.business.findMany()

  for (const business of businesses) {
    const clients = await prisma.client.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'asc' }
    })

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i]
      if (!client.displayId) {
        await prisma.client.update({
          where: { id: client.id },
          data: { displayId: `CL-${String(i + 1).padStart(3, '0')}` }
        })
      }
    }

    const projects = await prisma.project.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'asc' }
    })

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i]
      if (!project.displayId) {
        await prisma.project.update({
          where: { id: project.id },
          data: { displayId: `PRJ-${String(i + 1).padStart(3, '0')}` }
        })
      }
    }
  }
  console.log('Successfully assigned displayIds to existing records.')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
