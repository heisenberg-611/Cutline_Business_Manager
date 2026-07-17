'use server'

import { requireAdmin } from '@/lib/auth'
import prisma from '@/modules/core/db/prisma'
import { format, subDays, eachDayOfInterval } from 'date-fns'

export async function getAnalyticsData(startDateStr: string, endDateStr: string) {
  const { orgId } = await requireAdmin()

  const startDate = new Date(startDateStr)
  startDate.setHours(0, 0, 0, 0)
  
  const endDate = new Date(endDateStr)
  endDate.setHours(23, 59, 59, 999)

  // 1. Project Volume (Time-series)
  const projects = await prisma.project.findMany({
    where: {
      businessId: orgId,
      createdAt: { gte: startDate, lte: endDate }
    },
    select: { createdAt: true },
    cacheStrategy: { ttl: 60, swr: 60 }
  })

  const volumeMap: Record<string, number> = {}
  const daysInterval = eachDayOfInterval({ start: startDate, end: endDate })
  
  daysInterval.forEach(day => {
    volumeMap[format(day, 'MMM dd')] = 0
  })

  projects.forEach(p => {
    const dateStr = format(p.createdAt, 'MMM dd')
    if (volumeMap[dateStr] !== undefined) {
      volumeMap[dateStr]++
    }
  })

  const volumeData = Object.entries(volumeMap).map(([date, count]) => ({ date, count }))

  // 2. Stage Distribution (Current snapshot)
  const template = await prisma.workflowTemplate.findFirst({
    where: { businessId: orgId },
    include: { stages: { orderBy: { orderIndex: 'asc' } } }
  })

  let stageData: any[] = []
  
  if (template) {
    const stageGroups = await prisma.project.groupBy({
      by: ['statusStageId'],
      where: { businessId: orgId, isArchived: false },
      _count: { id: true },
      cacheStrategy: { ttl: 60, swr: 60 }
    })
    
    // Gradient / Brand colors for the pie chart
    const colors = ['#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b', '#f97316']
    
    stageData = template.stages.map((stage, index) => {
      const group = stageGroups.find(g => g.statusStageId === stage.id)
      const count = group ? group._count.id : 0
      return {
        name: stage.name,
        value: count,
        fill: colors[index % colors.length]
      }
    }).filter(s => s.value > 0)
  }

  // 3. Revenue Trend
  const invoices = await prisma.invoice.findMany({
    where: {
      businessId: orgId,
      status: { in: ['PAID', 'PARTIALLY_PAID'] },
      updatedAt: { gte: startDate, lte: endDate } // Using updatedAt as a proxy for payment date since paidAt doesn't exist
    },
    select: { updatedAt: true, amountPaidCents: true, totalCents: true, status: true },
    cacheStrategy: { ttl: 60, swr: 60 }
  })

  const revenueMap: Record<string, number> = {}
  daysInterval.forEach(day => {
    revenueMap[format(day, 'MMM dd')] = 0
  })

  invoices.forEach(inv => {
    const dateStr = format(inv.updatedAt, 'MMM dd')
    if (revenueMap[dateStr] !== undefined) {
      const amount = inv.status === 'PAID' ? inv.totalCents : inv.amountPaidCents
      revenueMap[dateStr] += (amount / 100)
    }
  })

  const revenueData = Object.entries(revenueMap).map(([date, amount]) => ({ date, amount }))

  // Summary Metrics
  const totalProjects = projects.length
  const totalRevenue = Object.values(revenueMap).reduce((a,b) => a+b, 0)
  const activeProjectsCount = stageData.reduce((a, b) => a + b.value, 0)

  // Fetch business currency
  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { defaultCurrency: true }
  })

  // 4. Expenses Trend
  const expenses = await prisma.expense.findMany({
    where: {
      businessId: orgId,
      dateIncurred: { gte: startDate, lte: endDate }
    },
    select: { dateIncurred: true, amountCents: true },
    cacheStrategy: { ttl: 60, swr: 60 }
  })

  const expenseMap: Record<string, number> = {}
  daysInterval.forEach(day => {
    expenseMap[format(day, 'MMM dd')] = 0
  })

  expenses.forEach(exp => {
    const dateStr = format(exp.dateIncurred, 'MMM dd')
    if (expenseMap[dateStr] !== undefined) {
      expenseMap[dateStr] += (exp.amountCents / 100)
    }
  })

  const expenseData = Object.entries(expenseMap).map(([date, amount]) => ({ date, amount }))
  const totalExpenses = Object.values(expenseMap).reduce((a, b) => a + b, 0)

  // 5. Net Profit Trend
  let cumulativeProfit = 0;
  const netProfitData = daysInterval.map(day => {
    const dateStr = format(day, 'MMM dd')
    const rev = revenueMap[dateStr] || 0
    const exp = expenseMap[dateStr] || 0
    cumulativeProfit += (rev - exp);
    return { date: dateStr, amount: cumulativeProfit }
  })
  const totalNetProfit = totalRevenue - totalExpenses

  // 6. Combined Finance Data
  let cumulativeRevenue = 0;
  let cumulativeExpenses = 0;
  const combinedFinanceData = daysInterval.map(day => {
    const dateStr = format(day, 'MMM dd')
    const rev = revenueMap[dateStr] || 0
    const exp = expenseMap[dateStr] || 0
    cumulativeRevenue += rev;
    cumulativeExpenses += exp;
    return { date: dateStr, revenue: cumulativeRevenue, expenses: cumulativeExpenses }
  })

  return {
    volumeData,
    stageData,
    revenueData,
    expenseData,
    netProfitData,
    combinedFinanceData,
    metrics: {
      totalProjects,
      totalRevenue,
      totalExpenses,
      totalNetProfit,
      activeProjectsCount,
      currency: business?.defaultCurrency || 'USD'
    }
  }
}
