import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Searching for orphaned businesses (0 members)...')

  const orphanedBusinesses = await prisma.business.findMany({
    where: {
      memberships: {
        none: {}
      }
    },
    include: {
      _count: {
        select: {
          projects: true,
          invoices: true,
          clients: true,
          assets: true
        }
      }
    }
  })

  if (orphanedBusinesses.length === 0) {
    console.log('✅ Good news! No orphaned businesses found.')
    return
  }

  console.log(`⚠️ Found ${orphanedBusinesses.length} orphaned business(es):\n`)

  orphanedBusinesses.forEach((business) => {
    console.log(`Business Name : ${business.name}`)
    console.log(`Business ID   : ${business.id}`)
    console.log(`Created At    : ${business.createdAt.toISOString()}`)
    console.log(`Data Attached :`)
    console.log(`  - Projects : ${business._count.projects}`)
    console.log(`  - Clients  : ${business._count.clients}`)
    console.log(`  - Invoices : ${business._count.invoices}`)
    console.log(`  - Assets   : ${business._count.assets}`)
    console.log('--------------------------------------------------')
  })

  console.log('\n💡 Note: This script only IDENTIFIES orphaned businesses. It does not delete them.')
  console.log('If you want to manually delete them via the database, you can use:')
  console.log('npx prisma studio')
  console.log('Or you can expand this script to include a deleteMany command (be careful!).\n')
}

main()
  .catch((e) => {
    console.error('❌ Error running script:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
