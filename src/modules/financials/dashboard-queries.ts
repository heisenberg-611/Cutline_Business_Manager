import prisma from '@/modules/core/db/prisma'

export async function getOutstandingInvoices(businessId: string) {
  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] }
    },
    select: {
      id: true,
      dueDate: true,
      amountDueCents: true,
      currency: true
    },
    cacheStrategy: { ttl: 60, swr: 60 }
  })

  const now = new Date()
  const buckets = {
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0
  }

  invoices.forEach(inv => {
    if (!inv.dueDate) return
    const daysOverdue = Math.floor((now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysOverdue <= 0) return // Not overdue yet technically, but we might want to show them? The spec says "aging buckets" usually implies overdue.

    if (daysOverdue <= 30) buckets['0-30'] += inv.amountDueCents
    else if (daysOverdue <= 60) buckets['31-60'] += inv.amountDueCents
    else if (daysOverdue <= 90) buckets['61-90'] += inv.amountDueCents
    else buckets['90+'] += inv.amountDueCents
  })

  return buckets
}

export async function getRevenueSummary(businessId: string, startDate: Date, endDate: Date) {
  const [paymentsAgg, invoicesAgg] = await Promise.all([
    // Cash-basis (Payments received)
    prisma.payment.aggregate({
      where: {
        businessId,
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { amountCents: true },
      cacheStrategy: { ttl: 60, swr: 60 }
    }),
    // Accrual-basis (Invoices issued)
    prisma.invoice.aggregate({
      where: {
        businessId,
        issuedAt: { gte: startDate, lte: endDate },
        status: { notIn: ['DRAFT', 'VOID', 'CREDIT_NOTE'] }
      },
      _sum: { totalCents: true },
      cacheStrategy: { ttl: 60, swr: 60 }
    })
  ])

  const cashRevenue = paymentsAgg._sum.amountCents || 0
  const accrualRevenue = invoicesAgg._sum.totalCents || 0

  return { cashRevenue, accrualRevenue }
}

export async function getProfitByProject(businessId: string, projectId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { businessId, projectId, status: { notIn: ['DRAFT', 'VOID', 'CREDIT_NOTE'] } },
    select: { amountPaidCents: true },
    cacheStrategy: { ttl: 60, swr: 60 }
  })

  const expenses = await prisma.expense.aggregate({
    where: { businessId, projectId },
    _sum: { amountCents: true },
    cacheStrategy: { ttl: 60, swr: 60 }
  })

  const revenueCents = invoices.reduce((sum, inv) => sum + inv.amountPaidCents, 0)
  const expenseCents = expenses._sum.amountCents || 0

  return {
    revenueCents,
    expenseCents,
    profitCents: revenueCents - expenseCents
  }
}

export async function getAgingReport(businessId: string) {
  return getOutstandingInvoices(businessId)
}

export async function getStudioHealth(businessId: string) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // 1. Fetch latest snapshot (cached via Prisma Accelerate for 1 hour)
  const snapshot = await prisma.analyticsSnapshot.findFirst({
    where: { businessId },
    orderBy: { date: 'desc' },
    // Safe to cache this read for 1 hour because it's a daily snapshot
    cacheStrategy: { ttl: 3600, swr: 60 }
  })

  // 2. Live merge for intra-day sensitive data (Outstanding and Overdue)
  const [outstandingInvoices, expenseAgg] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        businessId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] }
      },
      select: { amountDueCents: true, status: true, dueDate: true },
      cacheStrategy: { ttl: 60, swr: 60 }
    }),
    prisma.expense.aggregate({
      where: {
        businessId,
      },
      _sum: { amountCents: true },
      cacheStrategy: { ttl: 60, swr: 60 }
    })
  ])

  const liveOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.amountDueCents, 0)
  const liveOverdue = outstandingInvoices
    .filter(inv => inv.status === 'OVERDUE' || (inv.dueDate && inv.dueDate < now))
    .reduce((sum, inv) => sum + inv.amountDueCents, 0)
  const expenseTotal = expenseAgg._sum.amountCents ?? 0

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { defaultCurrency: true }
  })

  if (!snapshot) {
    // Fallback if no snapshot exists yet (e.g. cron hasn't run)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(now.getDate() - 90)

    const [
      { cashRevenue: revenueMTD },
      { cashRevenue: lastMonthRevenue },
      memberships,
      timeEntries,
      activeProjects,
      feedback,
      { accrualRevenue: revenue90d }
    ] = await Promise.all([
      getRevenueSummary(businessId, startOfMonth, now),
      getRevenueSummary(businessId, startOfLastMonth, endOfLastMonth),
      prisma.businessMembership.findMany({ where: { businessId } }),
      prisma.timeEntry.findMany({
        where: { project: { businessId }, isBillable: true, createdAt: { gte: startOfMonth } }
      }),
      prisma.project.findMany({
        where: { businessId, isArchived: false },
        include: { statusStage: true, stageHistory: { orderBy: { enteredAt: 'desc' }, take: 1 } }
      }),
      prisma.feedbackResponse.findMany({ where: { businessId } }),
      getRevenueSummary(businessId, ninetyDaysAgo, now)
    ])

    const revenueDelta = lastMonthRevenue > 0
      ? ((revenueMTD - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    const daysInPeriod = Math.max(1, (now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24))
    const weeksInPeriod = daysInPeriod / 7

    const totalAvailableHours = memberships.reduce((sum, m) => sum + (m.weeklyCapacityHours * weeksInPeriod), 0)
    const billableHours = timeEntries.reduce((sum, t) => sum + t.durationMinutes, 0) / 60
    const utilization = totalAvailableHours > 0 ? (billableHours / totalAvailableHours) * 100 : 0

    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(now.getDate() + 3)

    let atRiskCount = 0
    activeProjects.forEach(p => {
      // Safely get the stage name and convert to lowercase once
      const stageName = p.statusStage?.name?.toLowerCase() || ''

      // Check if the project is in any final/delivery stage
      const isFinalStage =
        stageName.includes('deliver') ||
        stageName.includes('done') ||
        stageName.includes('complet') ||
        stageName.includes('close') ||
        stageName.includes('finish') ||
        stageName.includes('final') ||
        stageName.includes('launch') ||
        stageName.includes('live') ||
        stageName.includes('ship') ||
        stageName.includes('release') ||
        stageName.includes('handoff') ||
        stageName.includes('handover') ||
        stageName.includes('deploy') ||
        stageName.includes('accept') ||
        stageName.includes('approv') ||
        stageName.includes('sign-off') ||
        stageName.includes('signoff') ||
        stageName.includes('archive') ||
        stageName.includes('fulfill') ||
        stageName.includes('wrap') ||
        stageName.includes('conclude') ||
        stageName.includes('resolve') ||
        stageName.includes('settle')

      // Skip calculating risk if the project is already in a final stage
      if (isFinalStage) return

      let isAtRisk = false
      if (p.deadline && p.deadline <= threeDaysFromNow) isAtRisk = true
      if (!isAtRisk && p.statusStage?.estimatedHours && p.stageHistory[0]) {
        const hoursInStage = (now.getTime() - p.stageHistory[0].enteredAt.getTime()) / (1000 * 60 * 60)
        if (hoursInStage > p.statusStage.estimatedHours) isAtRisk = true
      }
      if (isAtRisk) atRiskCount++
    })

    const avgFeedback = feedback.length > 0
      ? feedback.reduce((sum, f) => sum + f.overallScore, 0) / feedback.length : 0

    const dso = revenue90d > 0 ? (liveOutstanding / revenue90d) * 90 : 0

    return {
      revenueMTD,
      revenueLastMonth: lastMonthRevenue,
      revenueDelta,
      expenseTotal,
      outstanding: liveOutstanding,
      overdue: liveOverdue,
      utilization,
      atRiskCount,
      avgFeedback,
      dso,
      currency: business?.defaultCurrency || 'USD'
    }
  }

  return {
    revenueMTD: snapshot.revenueMTDCents,
    revenueLastMonth: snapshot.revenueLastMonthCents,
    revenueDelta: snapshot.revenueDelta,
    expenseTotal,
    outstanding: liveOutstanding, // Live merged
    overdue: liveOverdue,         // Live merged
    utilization: snapshot.utilization,
    atRiskCount: snapshot.atRiskCount,
    avgFeedback: snapshot.avgFeedback,
    dso: snapshot.dso,
    currency: business?.defaultCurrency || 'USD'
  }
}

export async function getRevenueTrend(businessId: string) {
  const now = new Date()

  // 1. Fetch latest snapshot for the 5 closed historical months
  const snapshot = await prisma.analyticsSnapshot.findFirst({
    where: { businessId },
    orderBy: { date: 'desc' },
    cacheStrategy: { ttl: 3600, swr: 60 }
  })

  let historicalTrend: any[] = []
  if (snapshot && snapshot.historicalTrendJson) {
    // Parse the JSON. The snapshot worker generates 6 months ending in the current month.
    const trendData = JSON.parse(snapshot.historicalTrendJson as string)
    // Keep the 5 oldest months (the closed ones)
    historicalTrend = trendData.slice(0, 5)
  } else {
    // Fallback if no snapshot: generate live history
    const trendPromises: Promise<{ month: string; revenue: number }>[] = []
    for (let i = 5; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      trendPromises.push(
        getRevenueSummary(businessId, d, end).then(({ cashRevenue }) => ({
          month: d.toLocaleString('default', { month: 'short' }),
          revenue: cashRevenue / 100
        }))
      )
    }
    historicalTrend = await Promise.all(trendPromises)
  }

  // 2. Live query for the current, still-open month
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const { cashRevenue: liveCurrentRevenue } = await getRevenueSummary(businessId, startOfCurrentMonth, now)

  const currentMonthEntry = {
    month: startOfCurrentMonth.toLocaleString('default', { month: 'short' }),
    revenue: liveCurrentRevenue / 100
  }

  return [...historicalTrend, currentMonthEntry]
}
