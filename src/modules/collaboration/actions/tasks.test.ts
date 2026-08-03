import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthorizeEntityAccess = vi.fn()
const mockRequireSession = vi.fn()
vi.mock('../authz', () => ({
  authorizeEntityAccess: (...args: unknown[]) => mockAuthorizeEntityAccess(...args),
  requireSession: () => mockRequireSession(),
}))

const mockCreateNotification = vi.fn()
vi.mock('@/modules/notifications/services', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockPrisma = {
  task: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  businessMembership: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  $transaction: vi.fn((ops: unknown[]) => Promise.resolve(ops)),
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const { createTask, updateTaskStatus, updateTask, reorderTasks } = await import('./tasks')

const CTX = { userId: 'user_me', orgId: 'org_1', isAdmin: false }
const TASK = {
  id: 'task_1',
  businessId: 'org_1',
  projectId: 'proj_1',
  title: 'Lock the edit',
  status: 'TODO',
  assigneeId: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthorizeEntityAccess.mockResolvedValue(CTX)
  mockRequireSession.mockResolvedValue({ userId: 'user_me', orgId: 'org_1' })
  mockPrisma.task.findFirst.mockResolvedValue(TASK)
  mockPrisma.task.create.mockResolvedValue({ id: 'task_new' })
  mockPrisma.businessMembership.findUnique.mockResolvedValue({ userId: 'user_other' })
})

describe('createTask', () => {
  it('authorizes write on the parent project', async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null) // no existing task for orderIndex
    await createTask({ projectId: 'proj_1', title: 'New task' })
    expect(mockAuthorizeEntityAccess).toHaveBeenCalledWith('Project', 'proj_1', 'write')
  })

  it('rejects an empty title', async () => {
    await expect(createTask({ projectId: 'proj_1', title: '   ' })).rejects.toThrow(
      'Task title cannot be empty.'
    )
  })

  it('rejects an over-long title', async () => {
    await expect(
      createTask({ projectId: 'proj_1', title: 'x'.repeat(201) })
    ).rejects.toThrow(/cannot exceed/)
  })

  // An assignee id arrives from the client and must be checked against the
  // tenant, or a task could be assigned to a user in another business.
  it('rejects an assignee outside the business', async () => {
    mockPrisma.businessMembership.findUnique.mockResolvedValue(null)
    await expect(
      createTask({ projectId: 'proj_1', title: 'x', assigneeId: 'user_outsider' })
    ).rejects.toThrow('Assignee is not a member of this business.')
  })

  it('appends after the current last task', async () => {
    mockPrisma.task.findFirst.mockResolvedValue({ orderIndex: 4 })
    await createTask({ projectId: 'proj_1', title: 'New task' })
    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderIndex: 5 }) })
    )
  })

  it('starts at index 0 when the project has no tasks', async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null)
    await createTask({ projectId: 'proj_1', title: 'First' })
    expect(mockPrisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderIndex: 0 }) })
    )
  })

  it('notifies the assignee', async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null)
    await createTask({ projectId: 'proj_1', title: 'x', assigneeId: 'user_other' })
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user_other', type: 'task' })
    )
  })

  it('does not notify when assigning to yourself', async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null)
    mockPrisma.businessMembership.findUnique.mockResolvedValue({ userId: 'user_me' })
    await createTask({ projectId: 'proj_1', title: 'x', assigneeId: 'user_me' })
    expect(mockCreateNotification).not.toHaveBeenCalled()
  })
})

describe('updateTaskStatus', () => {
  it('sets completedAt when moving to DONE', async () => {
    await updateTaskStatus('task_1', 'DONE')
    const arg = mockPrisma.task.update.mock.calls[0][0]
    expect(arg.data.completedAt).toBeInstanceOf(Date)
  })

  // A stale completion timestamp on a reopened task would misreport delivery.
  it('clears completedAt when reopening', async () => {
    mockPrisma.task.findFirst.mockResolvedValue({ ...TASK, status: 'DONE' })
    await updateTaskStatus('task_1', 'TODO')
    expect(mockPrisma.task.update.mock.calls[0][0].data.completedAt).toBeNull()
  })

  it('writes an audit log entry', async () => {
    await updateTaskStatus('task_1', 'DONE')
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ entityType: 'Task', action: 'TASK_COMPLETED' }),
      })
    )
  })

  it('is a no-op when the status is unchanged', async () => {
    await updateTaskStatus('task_1', 'TODO')
    expect(mockPrisma.task.update).not.toHaveBeenCalled()
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled()
  })

  it('rejects a task from another tenant', async () => {
    mockPrisma.task.findFirst.mockResolvedValue(null)
    await expect(updateTaskStatus('task_x', 'DONE')).rejects.toThrow('Task not found')
  })

  // Permissions must come from the project, not the task row.
  it('authorizes through the parent project', async () => {
    await updateTaskStatus('task_1', 'DONE')
    expect(mockAuthorizeEntityAccess).toHaveBeenCalledWith('Project', 'proj_1', 'write')
  })
})

describe('updateTask', () => {
  it('notifies and audits on reassignment', async () => {
    await updateTask('task_1', { assigneeId: 'user_other' })
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'TASK_ASSIGNEE_CHANGED' }),
      })
    )
    expect(mockCreateNotification).toHaveBeenCalled()
  })

  it('does not audit when the assignee is unchanged', async () => {
    mockPrisma.task.findFirst.mockResolvedValue({ ...TASK, assigneeId: 'user_other' })
    await updateTask('task_1', { assigneeId: 'user_other' })
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled()
  })

  it('is a no-op when given nothing to change', async () => {
    await updateTask('task_1', {})
    expect(mockPrisma.task.update).not.toHaveBeenCalled()
  })

  it('allows clearing the assignee', async () => {
    mockPrisma.task.findFirst.mockResolvedValue({ ...TASK, assigneeId: 'user_other' })
    await updateTask('task_1', { assigneeId: null })
    expect(mockPrisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { assigneeId: null } })
    )
    expect(mockCreateNotification).not.toHaveBeenCalled()
  })
})

describe('reorderTasks', () => {
  it('persists the new order by index', async () => {
    mockPrisma.task.count.mockResolvedValue(3)
    await reorderTasks('proj_1', ['c', 'a', 'b'])
    expect(mockPrisma.task.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'c' },
      data: { orderIndex: 0 },
    })
    expect(mockPrisma.task.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'b' },
      data: { orderIndex: 2 },
    })
  })

  // Without the ownership count, a payload could smuggle in a task from a
  // project the caller cannot write to.
  it('rejects ids that do not belong to the project', async () => {
    mockPrisma.task.count.mockResolvedValue(2)
    await expect(reorderTasks('proj_1', ['a', 'b', 'foreign'])).rejects.toThrow(
      'Task not found'
    )
  })

  it('deduplicates ids before counting', async () => {
    mockPrisma.task.count.mockResolvedValue(2)
    await reorderTasks('proj_1', ['a', 'b', 'a'])
    expect(mockPrisma.task.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ['a', 'b'] } }) })
    )
  })
})
