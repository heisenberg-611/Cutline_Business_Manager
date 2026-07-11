'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { format, subDays, eachDayOfInterval } from 'date-fns'

export async function getAnalyticsData(days: number = 30) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = subDays(endDate, days - 1)
  startDate.setHours(0, 0, 0, 0)

  // 1. Project Volume (Time-series)
  const projects = await prisma.project.findMany({
    where: {
      businessId: orgId,
      createdAt: { gte: startDate, lte: endDate }
    },
    select: { createdAt: true }
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
    const allProjects = await prisma.project.findMany({
      where: { businessId: orgId, isArchived: false }
    })
    
    // Gradient / Brand colors for the pie chart
    const colors = ['#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b', '#f97316']
    
    stageData = template.stages.map((stage, index) => {
      const count = allProjects.filter(p => p.statusStageId === stage.id).length
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
    select: { updatedAt: true, amountPaidCents: true, totalCents: true, status: true }
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

  return {
    volumeData,
    stageData,
    revenueData,
    metrics: {
      totalProjects,
      totalRevenue,
      activeProjectsCount,
      currency: business?.defaultCurrency || 'USD'
    }
  }
}
