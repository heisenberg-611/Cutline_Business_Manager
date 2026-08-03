import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthorizeProjectAccess = vi.fn()
vi.mock('@/modules/projects/authz', () => ({
  authorizeProjectAccess: (...args: unknown[]) => mockAuthorizeProjectAccess(...args),
}))

vi.mock('../authz', () => ({ requireCollaborationPlan: vi.fn() }))
vi.mock('@/modules/notifications/services', () => ({ createNotification: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

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
    await expect(updateProjectMemberRole('proj_1', 'user_lead', 'OWNER')).resolves.toBeUndefined()
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
