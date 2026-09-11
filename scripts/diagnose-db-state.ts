import { PrismaClient } from '@prisma/client'
import { getActivePlan } from '../src/lib/subscription'

const prisma = new PrismaClient()

async function main() {
  console.log('=== GLOBAL SETTINGS ===')
  const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' } })
  console.log(settings)

  console.log('\n=== BUSINESSES & SEQUENCES & SUBSCRIPTIONS ===')
  const businesses = await prisma.business.findMany({
    include: {
      projects: {
        select: { id: true, displayId: true, title: true, isArchived: true },
        orderBy: { createdAt: 'desc' }
      },
      clients: {
        select: { id: true, displayId: true, displayName: true }
      },
      invoices: {
        select: { id: true, invoiceNumber: true }
      }
    }
  })

  for (const b of businesses) {
    const activePlan = getActivePlan(b)
    console.log(`\n--------------------------------------------------`)
    console.log(`Business: "${b.name}" (ID: ${b.id})`)
    console.log(`Subscription Plan: ${b.subscriptionPlan} | Purchased Plan: ${b.purchasedPlan} | Active Plan: ${activePlan}`)
    console.log(`Subscription Period End: ${b.subscriptionPeriodEnd}`)
    console.log(`Custom Project Limit: ${b.customProjectLimit}`)
    console.log(`Project Count: Total=${b.projects.length} (Active=${b.projects.filter(p => !p.isArchived).length}, Archived=${b.projects.filter(p => p.isArchived).length})`)

    // Extract maximum project number from displayId (e.g. PRJ-035 -> 35)
    let maxProjectNum = 0
    for (const p of b.projects) {
      if (p.displayId) {
        const match = p.displayId.match(/\d+$/)
        if (match) {
          const num = parseInt(match[0], 10)
          if (num > maxProjectNum) maxProjectNum = num
        }
      }
    }

    // Extract maximum client number from displayId (e.g. CL-005 -> 5)
    let maxClientNum = 0
    for (const c of b.clients) {
      if (c.displayId) {
        const match = c.displayId.match(/\d+$/)
        if (match) {
          const num = parseInt(match[0], 10)
          if (num > maxClientNum) maxClientNum = num
        }
      }
    }

    // Extract maximum invoice number
    let maxInvoiceNum = 0
    for (const inv of b.invoices) {
      if (inv.invoiceNumber) {
        const match = inv.invoiceNumber.match(/\d+$/)
        if (match) {
          const num = parseInt(match[0], 10)
          if (num > maxInvoiceNum) maxInvoiceNum = num
        }
      }
    }

    console.log(`projectSequence in DB: ${b.projectSequence} | Max PRJ number in projects: ${maxProjectNum} -> ${b.projectSequence < maxProjectNum ? '❌ OUT OF SYNC (COLLISION IMMINENT)' : '✅ OK'}`)
    console.log(`clientSequence in DB:  ${b.clientSequence} | Max CL number in clients:   ${maxClientNum} -> ${b.clientSequence < maxClientNum ? '❌ OUT OF SYNC (COLLISION IMMINENT)' : '✅ OK'}`)
    console.log(`invoiceSequence in DB: ${b.invoiceSequence} | Max INV number in invoices: ${maxInvoiceNum} -> ${b.invoiceSequence < maxInvoiceNum ? '❌ OUT OF SYNC' : '✅ OK'}`)

    // Check quota logic
    const currentCount = b.projects.length
    if (b.customProjectLimit !== null) {
      if (currentCount >= b.customProjectLimit) {
        console.log(`❌ QUOTA BLOCKED: Custom limit reached (${currentCount} >= ${b.customProjectLimit})`)
      } else {
        console.log(`✅ Quota OK: Custom limit (${currentCount} / ${b.customProjectLimit})`)
      }
    } else if (activePlan === 'FREE') {
      const limit = settings?.freeTierProjectLimit ?? 3
      if (currentCount >= limit) {
        console.log(`❌ QUOTA BLOCKED: Free tier limit reached (${currentCount} >= ${limit})`)
      } else {
        console.log(`✅ Quota OK: Free limit (${currentCount} / ${limit})`)
      }
    } else if (activePlan === 'PRO') {
      const limit = settings?.proTierProjectLimit ?? 20
      if (currentCount >= limit) {
        console.log(`❌ QUOTA BLOCKED: Pro tier limit reached (${currentCount} >= ${limit})`)
      } else {
        console.log(`✅ Quota OK: Pro limit (${currentCount} / ${limit})`)
      }
    } else {
      console.log(`✅ Quota OK: Business plan (Unlimited)`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
