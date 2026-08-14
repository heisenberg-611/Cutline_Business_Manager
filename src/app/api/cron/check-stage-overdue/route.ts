import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/modules/core/db/prisma'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { createNotification } from '@/modules/notifications/services'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // 1. Fetch all active projects with an assignee and a stage that has estimatedHours
  const projects = await prisma.project.findMany({
    where: {
      isArchived: false,
      assigneeId: { not: null },
      statusStageId: { not: null },
      statusStage: {
        estimatedHours: { not: null, gt: 0 }
      }
    },
    include: {
      statusStage: true,
      stageHistory: {
        orderBy: { enteredAt: 'desc' },
      }
    }
  })

  let notifiedCount = 0
  const now = new Date().getTime()

  for (const project of projects) {
    if (!project.statusStage || !project.assigneeId || !project.statusStage.estimatedHours) continue

    // The most recent entry in stageHistory for this stage
    const currentStageHistory = project.stageHistory.find(h => h.stageId === project.statusStageId)
    if (!currentStageHistory) continue

    const hoursInStage = (now - currentStageHistory.enteredAt.getTime()) / (1000 * 60 * 60)

    if (hoursInStage > project.statusStage.estimatedHours) {
      // It's overdue! Check if we already notified them recently (last 24 hours)
      const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000)
      
      const recentNotification = await prisma.notification.findFirst({
        where: {
          userId: project.assigneeId,
          businessId: project.businessId,
          type: 'stage-overdue',
          actionUrl: `/dashboard/projects/${project.id}`,
          createdAt: {
            gte: twentyFourHoursAgo
          }
        }
      })

      if (!recentNotification) {
        // Send notification
        await createNotification({
          userId: project.assigneeId,
          businessId: project.businessId,
          title: 'Project Stage Overdue',
          message: `Project "${project.title}" has exceeded its estimated time in the "${project.statusStage.name}" stage.`,
          type: 'stage-overdue',
          actionUrl: `/dashboard/projects/${project.id}`
        })
        notifiedCount++
      }
    }
  }

  return NextResponse.json({ success: true, count: notifiedCount, message: `Sent ${notifiedCount} overdue notifications` })
}
