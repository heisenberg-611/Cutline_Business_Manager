'use server'

import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/modules/notifications/services'
import type { TaskStatus } from '@prisma/client'
import { authorizeEntityAccess, requireSession } from '../authz'
import { publishCollabRefresh } from '../realtime'

const MAX_TITLE_LENGTH = 200

/**
 * Rebuild this project's pages, then nudge everyone else looking at them.
 *
 * Tasks go over the content-free `refresh` signal rather than carrying their
 * payload: they change rarely, so the per-viewer invocation is cheap, and the
 * refresh re-runs the server component, which re-authorizes. The discussion
 * makes the opposite trade — see modules/collaboration/realtime.
 */
async function syncTaskViewers(orgId: string, projectId: string, actorUserId: string) {
  revalidatePath(`/dashboard/projects/${projectId}`)
  revalidatePath(`/dashboard/collaboration/${projectId}`)
  await publishCollabRefresh(orgId, projectId, actorUserId)
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

  return prisma.task.findMany({
    where: { businessId: orgId, projectId },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
    select: {
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
    },
  })
    // `completer` is the relation name; the panel reads `completedBy`.
    .then((rows) => rows.map(({ completer, ...task }) => ({ ...task, completedBy: completer })))
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

  await prisma.auditLog.create({
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

  await syncTaskViewers(orgId, input.projectId, userId)
  return task.id
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { userId, orgId, task } = await authorizeTask(taskId, 'write')

  // Already in the requested state — but still refresh the caller, because this
  // is precisely the case where their view is stale. Returning bare left the
  // caller's optimistic tick with nothing to reconcile against, so it rolled
  // back to the stale value and the checkbox appeared to refuse the click,
  // permanently, for whoever was not the one who completed it.
  if (task.status === status) {
    await syncTaskViewers(orgId, task.projectId, userId)
    return
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

  await prisma.auditLog.create({
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

  await syncTaskViewers(orgId, task.projectId, userId)
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
    await syncTaskViewers(orgId, task.projectId, userId)
    return
  }

  await prisma.task.update({ where: { id: taskId }, data: patch })

  const reassigned = newAssignee !== undefined && newAssignee !== task.assigneeId

  if (reassigned) {
    await prisma.auditLog.create({
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

  await syncTaskViewers(orgId, task.projectId, userId)
}

export async function deleteTask(taskId: string) {
  const { orgId, userId, task } = await authorizeTask(taskId, 'write')

  await prisma.auditLog.create({
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

  await syncTaskViewers(orgId, task.projectId, userId)
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

  await syncTaskViewers(orgId, projectId, userId)
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
