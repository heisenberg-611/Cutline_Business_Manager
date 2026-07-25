import { PrismaClient } from '@prisma/client'
import { formatMoney, formatMoneyCompact, formatDollars } from './src/lib/format'

const prisma = new PrismaClient()

async function main() {
  console.log('--- 1. INVOICE CHECK ---')
  const invoice = await prisma.invoice.findFirst({
    include: { lineItems: true },
    where: { lineItems: { some: {} } },
    orderBy: { createdAt: 'desc' }
  })

  if (invoice) {
    console.log(`Invoice ID: ${invoice.id}, Currency: ${invoice.currency}`)
    let computedSubtotal = 0
    for (const item of invoice.lineItems) {
      const itemTotal = item.amountCents * item.quantity
      computedSubtotal += itemTotal
      console.log(`Line Item: ${item.quantity} x ${item.amountCents}c = ${itemTotal}c -> ${formatMoney(itemTotal, invoice.currency)}`)
    }
    console.log(`Computed Subtotal: ${computedSubtotal}c -> ${formatMoney(computedSubtotal, invoice.currency)}`)
    console.log(`DB Subtotal: ${invoice.subtotalCents}c -> ${formatMoney(invoice.subtotalCents, invoice.currency)}`)
    console.log(`DB Total: ${invoice.totalCents}c -> ${formatMoney(invoice.totalCents, invoice.currency)}`)
  } else {
    console.log('No invoices with line items found.')
  }

  console.log('\n--- 2. CHART DATA CHECK ---')
  // We want to check AnalyticsDashboard getAnalyticsData
  // Instead of importing the action (which might have Next.js env issues), let's just query a business and see what the data looks like
  
  const business = await prisma.business.findFirst({
    include: { invoices: true, expenses: true }
  })
  if (business) {
    console.log(`Business ID: ${business.id}, Currency: ${business.defaultCurrency}`)
    // Look at an invoice and an expense
    if (business.invoices.length > 0) {
       console.log(`Sample Invoice Total: ${business.invoices[0].totalCents}c -> ${formatMoneyCompact(business.invoices[0].totalCents, business.defaultCurrency)}`)
    }
  }

  console.log('\n--- HQ REVENUE CHART CHECK ---')
  // HQ RevenueChart gets data from hq/page.tsx:
  // It computes MRR by grouping businesses by plan.
  console.log('HQ RevenueChart uses data like:')
  const businessesByPlan = await prisma.business.groupBy({
    by: ['subscriptionPlan'],
    _count: { id: true }
  })
  console.log(businessesByPlan)
}

main().catch(console.error).finally(() => prisma.$disconnect())
