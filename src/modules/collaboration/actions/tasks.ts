'use server'

import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/modules/notifications/services'
import type { TaskStatus } from '@prisma/client'
import { authorizeEntityAccess, requireSession } from '../authz'

const MAX_TITLE_LENGTH = 200

export type TaskRow = {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  assigneeId: string | null
  dueDate: Date | null
  orderIndex: number
  completedAt: Date | null
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
      completedAt: true,
    },
  })
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

  revalidatePath(`/dashboard/projects/${input.projectId}`)
  return task.id
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const { userId, orgId, task } = await authorizeTask(taskId, 'write')

  if (task.status === status) return

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      // completedAt tracks when it actually finished; reopening clears it so a
      // stale timestamp cannot outlive the DONE state.
      completedAt: status === 'DONE' ? new Date() : null,
    },
  })

  await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: 'Task',
      entityId: taskId,
      action: status === 'DONE' ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
      actorUserId: userId,
      metadataJson: JSON.stringify({
        projectId: task.projectId,
        title: task.title,
        from: task.status,
        to: status,
      }),
    },
  })

  revalidatePath(`/dashboard/projects/${task.projectId}`)
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

  if (Object.keys(patch).length === 0) return

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

  revalidatePath(`/dashboard/projects/${task.projectId}`)
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

  revalidatePath(`/dashboard/projects/${task.projectId}`)
}

/**
 * Persists a drag-reorder. Every id is checked against the project so a payload
 * cannot move a task belonging to a project the caller cannot write to.
 */
export async function reorderTasks(projectId: string, orderedIds: string[]) {
  const { orgId } = await authorizeEntityAccess('Project', projectId, 'write')

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

  revalidatePath(`/dashboard/projects/${projectId}`)
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
