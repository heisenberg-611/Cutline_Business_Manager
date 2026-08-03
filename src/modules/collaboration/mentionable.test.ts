import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  projectMember: { findMany: vi.fn() },
  businessMembership: { findMany: vi.fn() },
  project: { findFirst: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const { mentionableUsersForProject, mentionableUserIds } = await import('./mentionable')

const user = (id: string, first: string) => ({
  id,
  firstName: first,
  lastName: 'X',
  email: `${id}@test.local`,
  imageUrl: null,
})

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.projectMember.findMany.mockResolvedValue([])
  mockPrisma.businessMembership.findMany.mockResolvedValue([])
  mockPrisma.project.findFirst.mockResolvedValue({ assignee: null })
})

describe('mentionableUsersForProject', () => {
  it('includes people on the project', async () => {
    mockPrisma.projectMember.findMany.mockResolvedValue([
      { user: user('u_kai', 'Kai') },
      { user: user('u_juno', 'Juno') },
    ])

    const result = await mentionableUsersForProject('org_1', 'proj_1')
    expect(result.map((u) => u.id)).toEqual(['u_kai', 'u_juno'])
  })

  // Admins reach every project through authorizeProjectAccess, so a mention of
  // one always resolves to something they can open.
  it('includes org admins even when not on the project', async () => {
    mockPrisma.businessMembership.findMany.mockResolvedValue([{ user: user('u_admin', 'Ada') }])

    const result = await mentionableUsersForProject('org_1', 'proj_1')
    expect(result.map((u) => u.id)).toContain('u_admin')
    expect(mockPrisma.businessMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'org_1', role: 'org:admin' },
      })
    )
  })

  // The whole point: a teammate on another project must not be offered.
  it('excludes business members who are neither on the project nor admins', async () => {
    mockPrisma.projectMember.findMany.mockResolvedValue([{ user: user('u_kai', 'Kai') }])
    mockPrisma.businessMembership.findMany.mockResolvedValue([{ user: user('u_admin', 'Ada') }])

    const result = await mentionableUsersForProject('org_1', 'proj_1')
    expect(result.map((u) => u.id).sort()).toEqual(['u_admin', 'u_kai'])
    expect(result.map((u) => u.id)).not.toContain('u_outsider')
  })

  it('does not list an admin twice when they are also a member', async () => {
    mockPrisma.projectMember.findMany.mockResolvedValue([{ user: user('u_admin', 'Ada') }])
    mockPrisma.businessMembership.findMany.mockResolvedValue([{ user: user('u_admin', 'Ada') }])

    const result = await mentionableUsersForProject('org_1', 'proj_1')
    expect(result).toHaveLength(1)
  })

  // A project whose membership row never got written must not make its own lead
  // unmentionable — same reasoning as the authorizer's legacy fallback.
  it('includes the project lead even without a membership row', async () => {
    mockPrisma.project.findFirst.mockResolvedValue({ assignee: user('u_lead', 'Lead') })

    const result = await mentionableUsersForProject('org_1', 'proj_1')
    expect(result.map((u) => u.id)).toContain('u_lead')
  })

  it('scopes the lead lookup to the business', async () => {
    await mentionableUsersForProject('org_1', 'proj_1')
    expect(mockPrisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'proj_1', businessId: 'org_1' } })
    )
  })
})

describe('mentionableUserIds', () => {
  it('returns the same people as a set', async () => {
    mockPrisma.projectMember.findMany.mockResolvedValue([{ user: user('u_kai', 'Kai') }])
    mockPrisma.businessMembership.findMany.mockResolvedValue([{ user: user('u_admin', 'Ada') }])

    const ids = await mentionableUserIds('org_1', 'proj_1')
    expect(ids.has('u_kai')).toBe(true)
    expect(ids.has('u_admin')).toBe(true)
    expect(ids.has('u_outsider')).toBe(false)
  })
})
