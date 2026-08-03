import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mocks must be declared before importing the module under test.
const mockAuth = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
}))

const mockPrisma = {
  project: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  projectMember: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const { authorizeProjectAccess, authorizeProjectsAccess, syncAssigneeMembership } = await import(
  './authz'
)

const ADMIN = { userId: 'user_admin', orgId: 'org_1', orgRole: 'org:admin' }
const MEMBER = { userId: 'user_member', orgId: 'org_1', orgRole: 'org:member' }

const PROJECT = { id: 'proj_1', businessId: 'org_1', assigneeId: null }

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.project.findFirst.mockResolvedValue(PROJECT)
  mockPrisma.projectMember.findUnique.mockResolvedValue(null)
})

describe('authorizeProjectAccess', () => {
  it('rejects a request with no active organization', async () => {
    mockAuth.mockResolvedValue({ userId: 'user_x', orgId: null, orgRole: null })
    await expect(authorizeProjectAccess('proj_1', 'read')).rejects.toThrow('Unauthorized')
  })

  it('rejects a project belonging to another tenant', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    mockPrisma.project.findFirst.mockResolvedValue(null)
    await expect(authorizeProjectAccess('proj_other', 'read')).rejects.toThrow('Project not found')
  })

  it('scopes the project lookup by businessId', async () => {
    mockAuth.mockResolvedValue(ADMIN)
    await authorizeProjectAccess('proj_1', 'read')
    expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 'proj_1', businessId: 'org_1' },
    })
  })

  it('grants an org admin every level without a membership row', async () => {
    mockAuth.mockResolvedValue(ADMIN)
    for (const level of ['read', 'write', 'manage'] as const) {
      const ctx = await authorizeProjectAccess('proj_1', level)
      expect(ctx.isAdmin).toBe(true)
      expect(ctx.memberRole).toBeNull()
    }
    expect(mockPrisma.projectMember.findUnique).not.toHaveBeenCalled()
  })

  it('denies a non-member', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    await expect(authorizeProjectAccess('proj_1', 'read')).rejects.toThrow(
      'Forbidden: You are not assigned to this project.'
    )
  })

  it('grants OWNER read, write and manage', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    mockPrisma.projectMember.findUnique.mockResolvedValue({ role: 'OWNER' })
    for (const level of ['read', 'write', 'manage'] as const) {
      await expect(authorizeProjectAccess('proj_1', level)).resolves.toMatchObject({
        isAdmin: false,
        memberRole: 'OWNER',
      })
    }
  })

  it('grants COLLABORATOR read and write but not manage', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    mockPrisma.projectMember.findUnique.mockResolvedValue({ role: 'COLLABORATOR' })
    await expect(authorizeProjectAccess('proj_1', 'read')).resolves.toBeDefined()
    await expect(authorizeProjectAccess('proj_1', 'write')).resolves.toBeDefined()
    await expect(authorizeProjectAccess('proj_1', 'manage')).rejects.toThrow('Forbidden')
  })

  it('grants WATCHER read only', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    mockPrisma.projectMember.findUnique.mockResolvedValue({ role: 'WATCHER' })
    await expect(authorizeProjectAccess('proj_1', 'read')).resolves.toBeDefined()
    await expect(authorizeProjectAccess('proj_1', 'write')).rejects.toThrow('Forbidden')
    await expect(authorizeProjectAccess('proj_1', 'manage')).rejects.toThrow('Forbidden')
  })

  // Guards the migration path: a project whose assigneeId was never backfilled
  // into ProjectMember must stay reachable by its assignee.
  it('falls back to the legacy assigneeId pointer when no membership row exists', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    mockPrisma.project.findFirst.mockResolvedValue({ ...PROJECT, assigneeId: MEMBER.userId })
    mockPrisma.projectMember.findUnique.mockResolvedValue(null)
    await expect(authorizeProjectAccess('proj_1', 'write')).resolves.toMatchObject({
      memberRole: 'OWNER',
    })
  })

  it('does not let the legacy fallback grant access to a different user', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    mockPrisma.project.findFirst.mockResolvedValue({ ...PROJECT, assigneeId: 'someone_else' })
    await expect(authorizeProjectAccess('proj_1', 'read')).rejects.toThrow('Forbidden')
  })
})

describe('authorizeProjectsAccess', () => {
  it('rejects when any project in the batch is unauthorized', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    mockPrisma.project.findMany.mockResolvedValue([
      { id: 'proj_1', assigneeId: null },
      { id: 'proj_2', assigneeId: null },
    ])
    mockPrisma.projectMember.findMany.mockResolvedValue([{ projectId: 'proj_1', role: 'OWNER' }])

    await expect(authorizeProjectsAccess(['proj_1', 'proj_2'], 'write')).rejects.toThrow('Forbidden')
  })

  it('allows a batch where every project is writable', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    mockPrisma.project.findMany.mockResolvedValue([
      { id: 'proj_1', assigneeId: null },
      { id: 'proj_2', assigneeId: null },
    ])
    mockPrisma.projectMember.findMany.mockResolvedValue([
      { projectId: 'proj_1', role: 'OWNER' },
      { projectId: 'proj_2', role: 'COLLABORATOR' },
    ])

    await expect(authorizeProjectsAccess(['proj_1', 'proj_2'], 'write')).resolves.toMatchObject({
      isAdmin: false,
    })
  })

  // The previous loop iterated only over projects the query returned, so an id
  // from another tenant was skipped rather than rejected.
  it('rejects a batch containing an id from another tenant', async () => {
    mockAuth.mockResolvedValue(MEMBER)
    mockPrisma.project.findMany.mockResolvedValue([{ id: 'proj_1', assigneeId: MEMBER.userId }])
    mockPrisma.projectMember.findMany.mockResolvedValue([])

    await expect(authorizeProjectsAccess(['proj_1', 'proj_foreign'], 'write')).rejects.toThrow(
      'Project not found'
    )
  })

  it('still tenant-checks every id for an admin', async () => {
    mockAuth.mockResolvedValue(ADMIN)
    mockPrisma.project.count.mockResolvedValue(1)
    await expect(authorizeProjectsAccess(['proj_1', 'proj_foreign'], 'write')).rejects.toThrow(
      'Project not found'
    )
  })

  it('deduplicates ids before counting', async () => {
    mockAuth.mockResolvedValue(ADMIN)
    mockPrisma.project.count.mockResolvedValue(1)
    await expect(authorizeProjectsAccess(['proj_1', 'proj_1'], 'write')).resolves.toMatchObject({
      isAdmin: true,
    })
  })

  it('rejects with no active organization', async () => {
    mockAuth.mockResolvedValue({ userId: 'u', orgId: null, orgRole: null })
    await expect(authorizeProjectsAccess(['proj_1'], 'write')).rejects.toThrow('Unauthorized')
  })
})

describe('syncAssigneeMembership', () => {
  it('adds the new assignee as OWNER', async () => {
    await syncAssigneeMembership('proj_1', 'user_new', null, 'user_admin')
    expect(mockPrisma.projectMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_userId: { projectId: 'proj_1', userId: 'user_new' } },
        update: { role: 'OWNER' },
      })
    )
    expect(mockPrisma.projectMember.updateMany).not.toHaveBeenCalled()
  })

  // Handover, not eviction: the outgoing assignee keeps read/write so work in
  // flight can still be finished, but loses manage.
  it('demotes the outgoing assignee to COLLABORATOR on reassignment', async () => {
    await syncAssigneeMembership('proj_1', 'user_new', 'user_old', 'user_admin')
    expect(mockPrisma.projectMember.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'proj_1', userId: 'user_old', role: 'OWNER' },
      data: { role: 'COLLABORATOR' },
    })
    expect(mockPrisma.projectMember.deleteMany).not.toHaveBeenCalled()
  })

  it('demotes the outgoing assignee even when the project is left unassigned', async () => {
    await syncAssigneeMembership('proj_1', null, 'user_old', 'user_admin')
    expect(mockPrisma.projectMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: 'COLLABORATOR' } })
    )
    expect(mockPrisma.projectMember.upsert).not.toHaveBeenCalled()
  })

  // Scoping the update to role: 'OWNER' is what stops an explicitly added
  // WATCHER from being silently promoted to COLLABORATOR.
  it('only touches the OWNER row, leaving explicit member roles intact', async () => {
    await syncAssigneeMembership('proj_1', 'user_new', 'user_old', 'user_admin')
    expect(mockPrisma.projectMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ role: 'OWNER' }) })
    )
  })

  it('does nothing to the old row when the assignee is unchanged', async () => {
    await syncAssigneeMembership('proj_1', 'user_same', 'user_same', 'user_admin')
    expect(mockPrisma.projectMember.updateMany).not.toHaveBeenCalled()
    expect(mockPrisma.projectMember.upsert).toHaveBeenCalled()
  })
})
