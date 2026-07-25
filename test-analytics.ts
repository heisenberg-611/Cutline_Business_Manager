import { PrismaClient } from '@prisma/client'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  const business = await prisma.business.findFirst({
    include: { invoices: true }
  })
  if (!business) return;

  const now = new Date()
  const revenueData = []

  // Replicating exactly how AnalyticsDashboard builds it
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(now, i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    const monthStr = format(d, 'MMM')

    const rev = await prisma.invoice.aggregate({
      where: {
        businessId: business.id,
        status: 'PAID',
        paidAt: { gte: start, lte: end }
      },
      _sum: { totalCents: true }
    })
    
    // In src/modules/analytics/actions.ts:
    // It returns `amount: rev._sum.totalCents || 0`
    const amount = rev._sum.totalCents || 0
    revenueData.push({ month: monthStr, amount })
  }
  
  console.log('Analytics revenueData:', revenueData)
}

main().catch(console.error).finally(() => prisma.$disconnect())
