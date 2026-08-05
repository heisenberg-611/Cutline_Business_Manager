import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/modules/core/db/prisma'
import { isAuthorizedCron } from '@/lib/cron-auth'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const today = new Date()

  // Find invoices that are SENT or PARTIALLY_PAID and past their due date
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ['SENT', 'PARTIALLY_PAID']
      },
      dueDate: {
        lt: today
      }
    }
  })

  let count = 0
  for (const invoice of overdueInvoices) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: 'OVERDUE' }
    })
    
    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        businessId: invoice.businessId,
        entityType: 'Invoice',
        entityId: invoice.id,
        action: 'MARKED_OVERDUE',
      }
    })
    
    count++
  }

  return NextResponse.json({ success: true, count, message: `Marked ${count} invoices as overdue` })
}
