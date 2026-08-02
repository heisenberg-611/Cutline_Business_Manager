import { NextRequest, NextResponse } from 'next/server'
import { verifySignatureAppRouter } from '@upstash/qstash/dist/nextjs'
import prisma from '@/modules/core/db/prisma'
import { getRevenueSummary } from '@/modules/financials/dashboard-queries'

async function handler(req: NextRequest) {
  try {
    const body = await req.json()
    const { businessIds } = body

    if (!Array.isArray(businessIds)) {
      return new NextResponse('Invalid payload', { status: 400 })
    }

    const today = new Date()
    const snapshotDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(today.getDate() - 90)

    for (const businessId of businessIds) {
      // 1. Execute metrics queries (we can do them sequentially here or with Promise.all 
      // since it's a background worker and we have 15s to process 5 businesses, 
      // Promise.all is best to ensure we finish fast).
      const [
        { cashRevenue: revenueMTDCents },
        { cashRevenue: lastMonthRevenue },
        outstandingInvoices,
        memberships,
        timeEntries,
        activeProjects,
        feedback,
        { accrualRevenue: revenue90d }
      ] = await Promise.all([
        getRevenueSummary(businessId, startOfMonth, today),
        getRevenueSummary(businessId, startOfLastMonth, endOfLastMonth),
        prisma.invoice.findMany({
          where: { businessId, status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] } },
          select: { amountDueCents: true, status: true, dueDate: true }
        }),
        prisma.businessMembership.findMany({ 
          where: { businessId },
          select: { weeklyCapacityHours: true }
        }),
        prisma.timeEntry.aggregate({
          where: { project: { businessId }, isBillable: true, createdAt: { gte: startOfMonth } },
          _sum: { durationMinutes: true }
        }),
        prisma.project.findMany({
          where: { businessId, isArchived: false },
          select: { 
            deadline: true, 
            statusStage: { select: { name: true, estimatedHours: true } }, 
            stageHistory: { orderBy: { enteredAt: 'desc' }, take: 1, select: { enteredAt: true } } 
          }
        }),
        prisma.feedbackResponse.aggregate({ 
          where: { businessId },
          _avg: { overallScore: true } 
        }),
        getRevenueSummary(businessId, ninetyDaysAgo, today)
      ])

      // 2. Calculations
      const revenueDelta = lastMonthRevenue > 0
        ? ((revenueMTDCents - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

      const outstandingCents = outstandingInvoices.reduce((sum, inv) => sum + inv.amountDueCents, 0)
      const overdueCents = outstandingInvoices
        .filter(inv => inv.status === 'OVERDUE' || (inv.dueDate && inv.dueDate < today))
        .reduce((sum, inv) => sum + inv.amountDueCents, 0)

      const daysInPeriod = Math.max(1, (today.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24))
      const weeksInPeriod = daysInPeriod / 7

      const totalAvailableHours = memberships.reduce((sum, m) => sum + (m.weeklyCapacityHours * weeksInPeriod), 0)
      const billableHours = (timeEntries._sum.durationMinutes || 0) / 60
      const utilization = totalAvailableHours > 0 ? (billableHours / totalAvailableHours) * 100 : 0

      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(today.getDate() + 3)

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
          const hoursInStage = (today.getTime() - p.stageHistory[0].enteredAt.getTime()) / (1000 * 60 * 60)
          if (hoursInStage > p.statusStage.estimatedHours) isAtRisk = true
        }
        if (isAtRisk) atRiskCount++
      })

      const avgFeedback = feedback._avg.overallScore || 0

      const dso = revenue90d > 0 ? (outstandingCents / revenue90d) * 90 : 0

      // 3. Historical Trend (6 months)
      const trendPromises: Promise<{ month: string; revenue: number }>[] = []
      for (let i = 5; i >= 0; i--) {
        const start = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999)
        trendPromises.push(
          getRevenueSummary(businessId, start, end).then(({ cashRevenue }) => ({
            month: start.toLocaleString('default', { month: 'short' }),
            revenue: cashRevenue / 100
          }))
        )
      }
      const historicalTrend = await Promise.all(trendPromises)

      // 4. Upsert Snapshot
      await prisma.analyticsSnapshot.upsert({
        where: {
          businessId_date: {
            businessId,
            date: snapshotDate
          }
        },
        update: {
          revenueMTDCents,
          revenueLastMonthCents: lastMonthRevenue,
          revenueDelta,
          outstandingCents,
          overdueCents,
          utilization,
          atRiskCount,
          avgFeedback,
          dso,
          historicalTrendJson: JSON.stringify(historicalTrend)
        },
        create: {
          businessId,
          date: snapshotDate,
          revenueMTDCents,
          revenueLastMonthCents: lastMonthRevenue,
          revenueDelta,
          outstandingCents,
          overdueCents,
          utilization,
          atRiskCount,
          avgFeedback,
          dso,
          historicalTrendJson: JSON.stringify(historicalTrend)
        }
      })
    }

    return NextResponse.json({ success: true, processed: businessIds.length })
  } catch (error) {
    console.error('Analytics Snapshot Worker Error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export const POST = async (req: NextRequest) => {
  const verifier = verifySignatureAppRouter(handler)
  return verifier(req)
}
