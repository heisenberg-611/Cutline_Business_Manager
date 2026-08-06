'use server'

import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/modules/notifications/services'
import type { TaskStatus } from '@prisma/client'
import { authorizeEntityAccess, requireSession } from '../authz'
import { publishCollabRefresh, publishCollabTasks } from '../realtime'
import { enrichActivityRow, type AuditRowForFeed } from '../activity-entries'
import type { ActivityEntry } from './activity'

const MAX_TITLE_LENGTH = 200

/**
 * Past this many tasks the payload stops being obviously small, so the change
 * goes out as a bare nudge instead and readers refetch. A project that large is
 * not the case this optimizes for.
 */
const MAX_BROADCAST_TASKS = 200

/** The columns the panel renders, in the order it renders them. */
const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  assigneeId: true,
  dueDate: true,
  orderIndex: true,
  createdAt: true,
  completedAt: true,
  completer: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const

/** Reads the list without re-authorizing; every caller has already done so. */
async function readTasks(orgId: string, projectId: string): Promise<TaskRow[]> {
  const rows = await prisma.task.findMany({
    where: { businessId: orgId, projectId },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    select: TASK_SELECT,
  })
  // `completer` is the relation name; the panel reads `completedBy`.
  return rows.map(({ completer, ...task }) => ({ ...task, completedBy: completer }))
}

/**
 * What a task mutation hands back to the caller that made it.
 *
 * Null when there is no realtime to carry it — then the action revalidates
 * instead and the caller's route re-renders, which is the old behaviour.
 */
export type TaskSyncResult = {
  at: number
  tasks: TaskRow[]
  activity: ActivityEntry | null
} | null

/**
 * Publish the change, and give the same payload back to whoever made it.
 *
 * Deliberately does NOT revalidate on the realtime path. revalidatePath inside
 * a Server Action re-renders the caller's route from the root layout down — the
 * dashboard layout, its queries and the navbar included — so every ticked
 * checkbox cost a full page render on top of the action itself. The actor gets
 * the new list from the return value and everyone else gets it off the channel,
 * so nothing needs to re-render a route at all.
 *
 * Without a key there is nothing to carry it, so that path still revalidates.
 */
async function syncTaskViewers(
  orgId: string,
  projectId: string,
  actorUserId: string,
  auditRow?: AuditRowForFeed
): Promise<TaskSyncResult> {
  const revalidate = () => {
    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath(`/dashboard/collaboration/${projectId}`)
  }

  if (!process.env.ABLY_API_KEY) {
    revalidate()
    return null
  }

  const tasks = await readTasks(orgId, projectId)
  if (tasks.length > MAX_BROADCAST_TASKS) {
    revalidate()
    await publishCollabRefresh(orgId, projectId, actorUserId)
    return null
  }

  const activity = auditRow ? await enrichActivityRow(auditRow) : null
  const at = Date.now()
  await publishCollabTasks(orgId, projectId, actorUserId, at, tasks, activity)
  return { at, tasks, activity }
}

export type TaskCompleter = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
}

export type TaskRow = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  assigneeId: string | null
  dueDate: Date | null
  orderIndex: number
  createdAt: Date
  completedAt: Date | null
  /**
   * Carried on the row rather than resolved from the member list, because the
   * person who finished a task need not be on the project — an admin can close
   * anything, and they would render as "Unknown" against a project roster.
   */
  completedBy: TaskCompleter | null
}

/**
 * Loads the task and confirms the caller may act on its project.
 *
 * Tasks carry businessId denormalized, but authorization is resolved through
 * the parent project so task permissions can never exceed project permissions.
 */
async function authorizeTask(taskId: string, level: 'read' | 'write') {
  const { orgId } = await requireSession()

  const task = await prisma.task.findFirst({
    where: { id: taskId, businessId: orgId },
  })
  if (!task) throw new Error('Task not found')

  const ctx = await authorizeEntityAccess('Project', task.projectId, level)
  return { ...ctx, task }
}

export async function getTasks(projectId: string): Promise<TaskRow[]> {
  const { orgId } = await authorizeEntityAccess('Project', projectId, 'read')

  return readTasks(orgId, projectId)
}

export async function createTask(input: {
  projectId: string
  title: string
  assigneeId?: string | null
  dueDate?: Date | null
}) {
  const { userId, orgId } = await authorizeEntityAccess('Project', input.projectId, 'write')

  const title = input.title.trim()
  if (!title) throw new Error('Task title cannot be empty.')
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Task title cannot exceed ${MAX_TITLE_LENGTH} characters.`)
  }

  const assigneeId = await validateAssignee(orgId, input.assigneeId)

  // New tasks go to the end of the list.
  const last = await prisma.task.findFirst({
    where: { projectId: input.projectId },
    orderBy: { orderIndex: 'desc' },
    select: { orderIndex: true },
  })

  const task = await prisma.task.create({
    data: {
      businessId: orgId,
      projectId: input.projectId,
      title,
      assigneeId,
      dueDate: input.dueDate ?? null,
      orderIndex: (last?.orderIndex ?? -1) + 1,
      createdBy: userId,
    },
  })

  const audit = await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: 'Task',
      entityId: task.id,
      action: 'TASK_CREATED',
      actorUserId: userId,
      metadataJson: JSON.stringify({ projectId: input.projectId, title }),
    },
  })

  if (assigneeId && assigneeId !== userId) {
    await notifyAssignment(orgId, assigneeId, title, input.projectId)
  }

  return syncTaskViewers(orgId, input.projectId, userId, audit)
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { userId, orgId, task } = await authorizeTask(taskId, 'write')

  // Already in the requested state — but still refresh the caller, because this
  // is precisely the case where their view is stale. Returning bare left the
  // caller's optimistic tick with nothing to reconcile against, so it rolled
  // back to the stale value and the checkbox appeared to refuse the click,
  // permanently, for whoever was not the one who completed it.
  if (task.status === status) {
    return syncTaskViewers(orgId, task.projectId, userId)
  }

  const isDone = status === 'DONE'

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      // completedAt tracks when it actually finished; reopening clears it so a
      // stale timestamp cannot outlive the DONE state.
      completedAt: isDone ? new Date() : null,
      // Who finished it, which is not always who it was assigned to. Cleared on
      // reopen for the same reason as the timestamp.
      completedById: isDone ? userId : null,
    },
  })

  const audit = await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: 'Task',
      entityId: taskId,
      action: isDone ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
      actorUserId: userId,
      metadataJson: JSON.stringify({
        projectId: task.projectId,
        title: task.title,
        from: task.status,
        to: status,
        // Who it was assigned to at the moment it was completed, so the feed can
        // say "finished a task assigned to X" rather than flattening every
        // completion into the same sentence. Omitted when nobody was on it, and
        // when the assignee finished their own work — neither is worth a clause.
        ...(isDone && task.assigneeId && task.assigneeId !== userId
          ? { completedForId: task.assigneeId }
          : {}),
      }),
    },
  })

  return syncTaskViewers(orgId, task.projectId, userId, audit)
}

export async function updateTask(
  taskId: string,
  data: { title?: string; assigneeId?: string | null; dueDate?: Date | null }
) {
  const { userId, orgId, task } = await authorizeTask(taskId, 'write')

  const patch: Record<string, unknown> = {}

  if (data.title !== undefined) {
    const title = data.title.trim()
    if (!title) throw new Error('Task title cannot be empty.')
    if (title.length > MAX_TITLE_LENGTH) {
      throw new Error(`Task title cannot exceed ${MAX_TITLE_LENGTH} characters.`)
    }
    patch.title = title
  }

  let newAssignee: string | null | undefined
  if (data.assigneeId !== undefined) {
    newAssignee = await validateAssignee(orgId, data.assigneeId)
    patch.assigneeId = newAssignee
  }

  if (data.dueDate !== undefined) patch.dueDate = data.dueDate

  // Same reasoning as updateTaskStatus: nothing to write usually means the
  // caller was acting on a value that is already set, so refresh them.
  if (Object.keys(patch).length === 0) {
    return syncTaskViewers(orgId, task.projectId, userId)
  }

  await prisma.task.update({ where: { id: taskId }, data: patch })

  const reassigned = newAssignee !== undefined && newAssignee !== task.assigneeId

  let audit: Awaited<ReturnType<typeof prisma.auditLog.create>> | undefined
  if (reassigned) {
    audit = await prisma.auditLog.create({
      data: {
        businessId: orgId,
        entityType: 'Task',
        entityId: taskId,
        action: 'TASK_ASSIGNEE_CHANGED',
        actorUserId: userId,
        metadataJson: JSON.stringify({
          projectId: task.projectId,
          from: task.assigneeId,
          to: newAssignee,
        }),
      },
    })

    if (newAssignee && newAssignee !== userId) {
      await notifyAssignment(orgId, newAssignee, (patch.title as string) ?? task.title, task.projectId)
    }
  }

  return syncTaskViewers(orgId, task.projectId, userId, audit)
}

export async function deleteTask(taskId: string) {
  const { orgId, userId, task } = await authorizeTask(taskId, 'write')

  const audit = await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: 'Task',
      entityId: taskId,
      action: 'TASK_DELETED',
      actorUserId: userId,
      metadataJson: JSON.stringify({ projectId: task.projectId, title: task.title }),
    },
  })

  await prisma.task.delete({ where: { id: taskId } })

  return syncTaskViewers(orgId, task.projectId, userId, audit)
}

/**
 * Persists a drag-reorder. Every id is checked against the project so a payload
 * cannot move a task belonging to a project the caller cannot write to.
 */
export async function reorderTasks(projectId: string, orderedIds: string[]) {
  const { userId, orgId } = await authorizeEntityAccess('Project', projectId, 'write')

  const unique = [...new Set(orderedIds)]
  const owned = await prisma.task.count({
    where: { id: { in: unique }, businessId: orgId, projectId },
  })
  if (owned !== unique.length) {
    throw new Error('Task not found')
  }

  await prisma.$transaction(
    unique.map((id, index) =>
      prisma.task.update({ where: { id }, data: { orderIndex: index } })
    )
  )

  return syncTaskViewers(orgId, projectId, userId)
}

/** An assignee must be a member of the caller's business. */
async function validateAssignee(orgId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return null

  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId: orgId, userId: assigneeId } },
    select: { userId: true },
  })
  if (!membership) throw new Error('Assignee is not a member of this business.')

  return assigneeId
}

async function notifyAssignment(
  orgId: string,
  assigneeId: string,
  title: string,
  projectId: string
) {
  await createNotification({
    businessId: orgId,
    userId: assigneeId,
    title: 'New task assigned',
    message: title,
    type: 'task',
    actionUrl: `/dashboard/projects/${projectId}`,
  })
}
