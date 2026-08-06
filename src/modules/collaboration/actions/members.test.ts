import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthorizeProjectAccess = vi.fn()
vi.mock('@/modules/projects/authz', () => ({
  authorizeProjectAccess: (...args: unknown[]) => mockAuthorizeProjectAccess(...args),
}))

vi.mock('../authz', () => ({ requireCollaborationPlan: vi.fn() }))
vi.mock('@/modules/notifications/services', () => ({ createNotification: vi.fn() }))
const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// Realtime is off without a key; mocked so no test reaches the network.
const mockPublish = vi.fn()
vi.mock('ably', () => ({
  Rest: class {
    channels = { get: () => ({ publish: (...args: unknown[]) => mockPublish(...args) }) }
  },
}))

const mockPrisma = {
  projectMember: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  businessMembership: { findUnique: vi.fn(), findMany: vi.fn() },
  auditLog: { create: vi.fn() },
  // Read back to build the roster payload.
  project: { findUnique: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const { addProjectMember, updateProjectMemberRole, removeProjectMember, getProjectMembers } =
  await import('./members')

const PROJECT = { id: 'proj_1', title: 'Brand Film', assigneeId: 'user_lead' }
const CTX = { orgId: 'org_1', userId: 'user_admin', project: PROJECT }

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthorizeProjectAccess.mockResolvedValue(CTX)
  mockPrisma.businessMembership.findUnique.mockResolvedValue({ userId: 'user_new' })
  mockPrisma.projectMember.findUnique.mockResolvedValue(null)
  mockPrisma.projectMember.updateMany.mockResolvedValue({ count: 1 })
  mockPrisma.projectMember.deleteMany.mockResolvedValue({ count: 1 })
  mockPrisma.projectMember.findMany.mockResolvedValue([])
  mockPrisma.project.findUnique.mockResolvedValue({ assigneeId: 'user_lead' })
})

describe('addProjectMember', () => {
  it("requires 'manage' on the project", async () => {
    await addProjectMember('proj_1', 'user_new')
    expect(mockAuthorizeProjectAccess).toHaveBeenCalledWith('proj_1', 'manage')
  })

  // The candidate id comes from the client.
  it('rejects someone outside the business', async () => {
    mockPrisma.businessMembership.findUnique.mockResolvedValue(null)
    await expect(addProjectMember('proj_1', 'user_outsider')).rejects.toThrow(
      'not a member of this business'
    )
    expect(mockPrisma.projectMember.create).not.toHaveBeenCalled()
  })

  it('rejects someone already on the project', async () => {
    mockPrisma.projectMember.findUnique.mockResolvedValue({ userId: 'user_new' })
    await expect(addProjectMember('proj_1', 'user_new')).rejects.toThrow(
      'already on this project'
    )
  })

  it('defaults to COLLABORATOR', async () => {
    await addProjectMember('proj_1', 'user_new')
    expect(mockPrisma.projectMember.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'COLLABORATOR' }) })
    )
  })

  it('writes an audit entry', async () => {
    await addProjectMember('proj_1', 'user_new')
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'PROJECT_MEMBER_ADDED' }),
      })
    )
  })
})

describe('updateProjectMemberRole', () => {
  it('changes the role of a non-lead member', async () => {
    await updateProjectMemberRole('proj_1', 'user_other', 'WATCHER')
    expect(mockPrisma.projectMember.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'proj_1', userId: 'user_other' },
      data: { role: 'WATCHER' },
    })
  })

  // Demoting the lead would leave a project whose lead cannot manage it.
  it('refuses to demote the project lead', async () => {
    await expect(updateProjectMemberRole('proj_1', 'user_lead', 'WATCHER')).rejects.toThrow(
      'Change the project lead'
    )
    expect(mockPrisma.projectMember.updateMany).not.toHaveBeenCalled()
  })

  it('allows the lead to stay OWNER', async () => {
    // Resolves rather than throwing; the value is the roster sync result, which
    // is null with realtime off.
    await expect(updateProjectMemberRole('proj_1', 'user_lead', 'OWNER')).resolves.toBeNull()
  })

  it('errors when the person is not on the project', async () => {
    mockPrisma.projectMember.updateMany.mockResolvedValue({ count: 0 })
    await expect(updateProjectMemberRole('proj_1', 'user_x', 'WATCHER')).rejects.toThrow(
      'not on this project'
    )
  })
})

describe('removeProjectMember', () => {
  it('removes a non-lead member', async () => {
    await removeProjectMember('proj_1', 'user_other')
    expect(mockPrisma.projectMember.deleteMany).toHaveBeenCalledWith({
      where: { projectId: 'proj_1', userId: 'user_other' },
    })
  })

  // authorizeProjectAccess falls back to assigneeId when no membership row
  // exists, so removing the lead would not actually revoke anything.
  it('refuses to remove the project lead', async () => {
    await expect(removeProjectMember('proj_1', 'user_lead')).rejects.toThrow(
      'Reassign the project before removing its lead'
    )
    expect(mockPrisma.projectMember.deleteMany).not.toHaveBeenCalled()
  })

  it('errors when the person is not on the project', async () => {
    mockPrisma.projectMember.deleteMany.mockResolvedValue({ count: 0 })
    await expect(removeProjectMember('proj_1', 'user_x')).rejects.toThrow('not on this project')
  })
})

describe('getProjectMembers', () => {
  it("needs only 'read', and flags the lead first", async () => {
    mockPrisma.projectMember.findMany.mockResolvedValue([
      {
        userId: 'user_other',
        role: 'COLLABORATOR',
        user: { id: 'user_other', firstName: 'Juno', lastName: 'Park', email: 'j@x.test', imageUrl: null },
      },
      {
        userId: 'user_lead',
        role: 'OWNER',
        user: { id: 'user_lead', firstName: 'Kai', lastName: 'Osei', email: 'k@x.test', imageUrl: null },
      },
    ])

    const rows = await getProjectMembers('proj_1')
    expect(mockAuthorizeProjectAccess).toHaveBeenCalledWith('proj_1', 'read')
    expect(rows[0]).toMatchObject({ userId: 'user_lead', isLead: true })
    expect(rows[1]).toMatchObject({ userId: 'user_other', isLead: false })
  })
})

describe('roster changes and the caller route', () => {
  /**
   * The reason these actions stopped revalidating.
   *
   * revalidatePath inside a Server Action re-renders the caller's route from
   * the root layout down — the dashboard queries and the navbar — so adding one
   * person to a project cost a full page render, and the refresh it published
   * cost every other viewer one too.
   */
  it('does not revalidate when the roster goes out over the channel', async () => {
    process.env.ABLY_API_KEY = 'test-key'
    try {
      await addProjectMember('proj_1', 'user_new')
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    } finally {
      delete process.env.ABLY_API_KEY
    }
  })

  it('publishes the roster itself, not a nudge to refetch', async () => {
    process.env.ABLY_API_KEY = 'test-key'
    try {
      await addProjectMember('proj_1', 'user_new')
      expect(mockPublish).toHaveBeenCalledWith(
        'collab-members',
        expect.objectContaining({ members: expect.any(Array), memberIds: expect.any(Array) })
      )
    } finally {
      delete process.env.ABLY_API_KEY
    }
  })

  // Whoever was removed is looking at a project they can no longer open, and
  // memberIds is how their client recognises itself.
  it('carries flat ids so a removed member can spot their own absence', async () => {
    process.env.ABLY_API_KEY = 'test-key'
    mockPrisma.projectMember.findMany.mockResolvedValue([
      { userId: 'user_stays', role: 'COLLABORATOR', createdAt: new Date(), user: { id: 'user_stays', firstName: 'A', lastName: 'B', email: 'a@b.c', imageUrl: null } },
    ])
    try {
      await removeProjectMember('proj_1', 'user_gone')
      const [, payload] = mockPublish.mock.calls[0]
      expect(payload.memberIds).toEqual(['user_stays'])
    } finally {
      delete process.env.ABLY_API_KEY
    }
  })

  it('falls back to revalidating when realtime is off', async () => {
    await addProjectMember('proj_1', 'user_new')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/collaboration/proj_1')
  })
})
