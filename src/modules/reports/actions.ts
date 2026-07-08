'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'

export async function getReportData(startDateStr: string, endDateStr: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)
  
  // Set time to end of day for inclusive filtering
  endDate.setHours(23, 59, 59, 999)

  // 1. Fetch Financial Data (Invoices)
  const invoices = await prisma.invoice.findMany({
    where: {
      businessId: orgId,
      issuedAt: {
        gte: startDate,
        lte: endDate
      },
      status: {
        in: ['PAID', 'PARTIALLY_PAID', 'SENT', 'OVERDUE']
      }
    },
    include: {
      client: true
    }
  })

  let totalRevenueCents = 0
  let outstandingBalanceCents = 0
  
  // Client Revenue breakdown
  const clientRevenueMap: Record<string, { name: string, amount: number }> = {}

  invoices.forEach(inv => {
    if (inv.status === 'PAID') {
      totalRevenueCents += inv.totalCents
      
      if (!clientRevenueMap[inv.clientId]) {
        clientRevenueMap[inv.clientId] = { name: inv.client.displayName, amount: 0 }
      }
      clientRevenueMap[inv.clientId].amount += inv.totalCents
    } else {
      // SENT, PARTIALLY_PAID, OVERDUE
      outstandingBalanceCents += inv.amountDueCents
      // We can also count partial payments as revenue
      if (inv.amountPaidCents > 0) {
        totalRevenueCents += inv.amountPaidCents
        if (!clientRevenueMap[inv.clientId]) {
          clientRevenueMap[inv.clientId] = { name: inv.client.displayName, amount: 0 }
        }
        clientRevenueMap[inv.clientId].amount += inv.amountPaidCents
      }
    }
  })

  // Sort top clients
  const topClients = Object.values(clientRevenueMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)

  // 2. Fetch Work Data (Time Entries)
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      project: { businessId: orgId },
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      project: true
    }
  })

  let totalDurationMinutes = 0
  const projectTimeMap: Record<string, { title: string, minutes: number }> = {}

  timeEntries.forEach(entry => {
    totalDurationMinutes += entry.durationMinutes
    
    if (!projectTimeMap[entry.projectId]) {
      projectTimeMap[entry.projectId] = { title: entry.project.title, minutes: 0 }
    }
    projectTimeMap[entry.projectId].minutes += entry.durationMinutes
  })

  const topProjectsByTime = Object.values(projectTimeMap)
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 5)

  // 3. New Projects created in this range
  const newProjectsCount = await prisma.project.count({
    where: {
      businessId: orgId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  return {
    finance: {
      totalRevenueCents,
      outstandingBalanceCents,
      topClients
    },
    work: {
      totalDurationMinutes,
      newProjectsCount,
      topProjectsByTime
    }
  }
}
