'use server'

import { requireAdmin } from '@/lib/auth'
import prisma from '@/modules/core/db/prisma'
import { format, eachDayOfInterval, differenceInDays } from 'date-fns'

/**
 * Project and task analytics.
 *
 * Kept apart from actions.ts, which answers "what happened over this window" for
 * money. These answer "how is the work itself going" — what each project earned,
 * how much of it shipped, and how the task backlog is moving.
 */

/** Ranked chart shows this many, then folds the tail into one row. */
const TOP_PROJECTS = 8

export type ProjectRevenueRow = {
  projectId: string
  title: string
  client: string
  /** Cash actually collected. */
  paidCents: number
  /** Billed but not yet collected — the gap is the story on a delivered project. */
  outstandingCents: number
  isDelivered: boolean
}

export type ProjectAnalytics = {
  revenueByProject: ProjectRevenueRow[]
  deliveredOverTime: { date: string; delivered: number }[]
  taskStatus: { status: string; label: string; count: number }[]
  metrics: {
    deliveredCount: number
    activeCount: number
    /** Median rather than mean: one stalled project should not move it. */
    medianDaysToDeliver: number | null
    tasksTotal: number
    tasksDone: number
    taskCompletionRate: number
    /** Collected against everything billed, as a percentage. */
    collectionRate: number
    currency: string
  }
}

const TASK_STATUS_LABEL: Record<string, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
}

export async function getProjectAnalytics(
  startDateStr: string,
  endDateStr: string
): Promise<ProjectAnalytics> {
  const { orgId } = await requireAdmin()

  const startDate = new Date(startDateStr)
  startDate.setHours(0, 0, 0, 0)
  const endDate = new Date(endDateStr)
  endDate.setHours(23, 59, 59, 999)

  // "Delivered" is the last stage of this business's own workflow, not a name
  // match. The codebase has three different keyword lists for this, and every
  // one of them misreads a workflow whose final stage is called something else
  // — "Launched", "Handed over". Position in the template is definitional and
  // survives renaming.
  const template = await prisma.workflowTemplate.findFirst({
    where: { businessId: orgId },
    include: { stages: { orderBy: { orderIndex: 'asc' } } },
  })
  const terminalStage = template?.stages.at(-1) ?? null

  const [projects, invoiceRows, taskGroups, business] = await Promise.all([
    prisma.project.findMany({
      where: { businessId: orgId, isArchived: false },
      select: {
        id: true,
        title: true,
        createdAt: true,
        statusStageId: true,
        client: { select: { displayName: true } },
        // Only the terminal stage's entries, so this stays small rather than
        // pulling every move a project ever made.
        stageHistory: terminalStage
          ? {
              where: { stageId: terminalStage.id },
              orderBy: { enteredAt: 'asc' },
              take: 1,
              select: { enteredAt: true },
            }
          : false,
      },
    }),
    // Grouped in the database rather than summed in JS over every invoice.
    prisma.invoice.groupBy({
      by: ['projectId'],
      where: { businessId: orgId, projectId: { not: null }, status: { not: 'DRAFT' } },
      _sum: { amountPaidCents: true, totalCents: true },
    }),
    prisma.task.groupBy({
      by: ['status'],
      where: { businessId: orgId },
      _count: { _all: true },
    }),
    prisma.business.findUnique({
      where: { id: orgId },
      select: { defaultCurrency: true },
    }),
  ])

  const paidByProject = new Map<string, { paid: number; billed: number }>(
    invoiceRows.map((row) => [
      row.projectId as string,
      {
        paid: row._sum.amountPaidCents ?? 0,
        billed: row._sum.totalCents ?? 0,
      },
    ])
  )

  const deliveredAtByProject = new Map<string, Date>()
  for (const project of projects) {
    const entered = Array.isArray(project.stageHistory) ? project.stageHistory[0] : null
    if (entered) deliveredAtByProject.set(project.id, entered.enteredAt)
  }

  const isDelivered = (projectId: string, statusStageId: string | null) =>
    terminalStage ? statusStageId === terminalStage.id : deliveredAtByProject.has(projectId)

  // Ranked by cash collected — the question is "which project earned us what",
  // so what was billed but never paid does not get to inflate the ranking. It
  // rides along as a second value instead.
  const ranked: ProjectRevenueRow[] = projects
    .map((project) => {
      const money = paidByProject.get(project.id)
      const paidCents = money?.paid ?? 0
      return {
        projectId: project.id,
        title: project.title,
        client: project.client?.displayName ?? '—',
        paidCents,
        outstandingCents: Math.max(0, (money?.billed ?? 0) - paidCents),
        isDelivered: isDelivered(project.id, project.statusStageId),
      }
    })
    .filter((row) => row.paidCents > 0 || row.outstandingCents > 0)
    .sort((a, b) => b.paidCents - a.paidCents)

  const head = ranked.slice(0, TOP_PROJECTS)
  const tail = ranked.slice(TOP_PROJECTS)
  const revenueByProject =
    tail.length > 0
      ? [
          ...head,
          {
            projectId: '__other__',
            title: `${tail.length} other project${tail.length === 1 ? '' : 's'}`,
            client: '',
            paidCents: tail.reduce((sum, r) => sum + r.paidCents, 0),
            outstandingCents: tail.reduce((sum, r) => sum + r.outstandingCents, 0),
            isDelivered: false,
          },
        ]
      : head

  // Deliveries per day across the window, zero-filled so the line does not
  // imply data where a day simply had none.
  const deliveredMap: Record<string, number> = {}
  for (const day of eachDayOfInterval({ start: startDate, end: endDate })) {
    deliveredMap[format(day, 'MMM dd')] = 0
  }
  const deliveryDurations: number[] = []
  for (const project of projects) {
    const deliveredAt = deliveredAtByProject.get(project.id)
    if (!deliveredAt) continue

    deliveryDurations.push(Math.max(0, differenceInDays(deliveredAt, project.createdAt)))

    if (deliveredAt >= startDate && deliveredAt <= endDate) {
      const key = format(deliveredAt, 'MMM dd')
      if (deliveredMap[key] !== undefined) deliveredMap[key] += 1
    }
  }
  const deliveredOverTime = Object.entries(deliveredMap).map(([date, delivered]) => ({
    date,
    delivered,
  }))

  const sortedDurations = [...deliveryDurations].sort((a, b) => a - b)
  const medianDaysToDeliver =
    sortedDurations.length === 0
      ? null
      : sortedDurations.length % 2 === 1
        ? sortedDurations[(sortedDurations.length - 1) / 2]
        : Math.round(
            (sortedDurations[sortedDurations.length / 2 - 1] +
              sortedDurations[sortedDurations.length / 2]) /
              2
          )

  // Fixed order, so the stacked bar reads the same regardless of which statuses
  // happen to be populated.
  const countByStatus = new Map<string, number>(
    taskGroups.map((g) => [g.status as string, g._count._all])
  )
  const taskStatus = (['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const).map((status) => ({
    status,
    label: TASK_STATUS_LABEL[status],
    count: countByStatus.get(status) ?? 0,
  }))

  const tasksTotal = taskStatus.reduce((sum, s) => sum + s.count, 0)
  const tasksDone = countByStatus.get('DONE') ?? 0

  const totalPaid = ranked.reduce((sum, r) => sum + r.paidCents, 0)
  const totalBilled = totalPaid + ranked.reduce((sum, r) => sum + r.outstandingCents, 0)

  const deliveredCount = projects.filter((p) => isDelivered(p.id, p.statusStageId)).length

  return {
    revenueByProject,
    deliveredOverTime,
    taskStatus,
    metrics: {
      deliveredCount,
      activeCount: projects.length - deliveredCount,
      medianDaysToDeliver,
      tasksTotal,
      tasksDone,
      taskCompletionRate: tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0,
      collectionRate: totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0,
      currency: business?.defaultCurrency || 'USD',
    },
  }
}
