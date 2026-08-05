import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  business: { findMany: vi.fn(), delete: vi.fn() },
  businessMembership: { deleteMany: vi.fn() },
  user: { deleteMany: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const mockDeleteUser = vi.fn()
const mockDeleteOrg = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({
    users: { deleteUser: (...a: unknown[]) => mockDeleteUser(...a) },
    organizations: { deleteOrganization: (...a: unknown[]) => mockDeleteOrg(...a) },
  }),
}))

const { classifyDeletion, performAccountDeletion, DeletionBlockedError } = await import(
  './account-deletion'
)

const USER = 'user_1'

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.business.delete.mockResolvedValue({})
  mockPrisma.businessMembership.deleteMany.mockResolvedValue({ count: 0 })
  mockPrisma.user.deleteMany.mockResolvedValue({ count: 1 })
})

describe('classifyDeletion', () => {
  it('treats a workspace with only its owner as solo', async () => {
    mockPrisma.business.findMany.mockResolvedValue([
      { id: 'org_1', name: 'Solo Studio', _count: { memberships: 1 } },
    ])

    await expect(classifyDeletion(USER)).resolves.toEqual({
      kind: 'SOLO_OWNER',
      businessId: 'org_1',
      businessName: 'Solo Studio',
    })
  })

  it('treats a workspace with other members as shared', async () => {
    mockPrisma.business.findMany.mockResolvedValue([
      { id: 'org_1', name: 'Agency', _count: { memberships: 4 } },
    ])

    await expect(classifyDeletion(USER)).resolves.toEqual({
      kind: 'SHARED_OWNER',
      businessName: 'Agency',
      otherMembers: 3,
    })
  })

  it('treats someone who owns nothing as a member only', async () => {
    mockPrisma.business.findMany.mockResolvedValue([])

    await expect(classifyDeletion(USER)).resolves.toEqual({ kind: 'MEMBER_ONLY' })
  })

  it('reports shared even when another workspace they own is solo', async () => {
    // Owning anything shared must dominate: the risk is destroying a colleague's
    // work, and that risk exists regardless of their other workspaces.
    mockPrisma.business.findMany.mockResolvedValue([
      { id: 'org_1', name: 'Solo Studio', _count: { memberships: 1 } },
      { id: 'org_2', name: 'Agency', _count: { memberships: 3 } },
    ])

    const scope = await classifyDeletion(USER)
    expect(scope.kind).toBe('SHARED_OWNER')
  })
})

describe('performAccountDeletion', () => {
  it('refuses to delete when the workspace has other members', async () => {
    mockPrisma.business.findMany.mockResolvedValue([
      { id: 'org_1', name: 'Agency', _count: { memberships: 4 } },
    ])

    await expect(performAccountDeletion(USER)).rejects.toThrow(DeletionBlockedError)

    // Nothing at all may have been touched.
    expect(mockPrisma.business.delete).not.toHaveBeenCalled()
    expect(mockPrisma.user.deleteMany).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('erases the workspace and the person for a solo owner', async () => {
    mockPrisma.business.findMany.mockResolvedValue([
      { id: 'org_1', name: 'Solo Studio', _count: { memberships: 1 } },
    ])

    await performAccountDeletion(USER)

    expect(mockPrisma.business.delete).toHaveBeenCalledWith({ where: { id: 'org_1' } })
    expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({ where: { id: USER } })
    expect(mockDeleteOrg).toHaveBeenCalledWith('org_1')
    expect(mockDeleteUser).toHaveBeenCalledWith(USER)
  })

  it('leaves business data alone for a member-only account', async () => {
    mockPrisma.business.findMany.mockResolvedValue([])

    await performAccountDeletion(USER)

    expect(mockPrisma.business.delete).not.toHaveBeenCalled()
    expect(mockDeleteOrg).not.toHaveBeenCalled()
    expect(mockPrisma.businessMembership.deleteMany).toHaveBeenCalledWith({ where: { userId: USER } })
    expect(mockPrisma.user.deleteMany).toHaveBeenCalledWith({ where: { id: USER } })
  })

  it('still reports success when Clerk cleanup fails after local deletion', async () => {
    // The destructive half has already happened. Throwing here would leave the
    // caller believing nothing was deleted when in fact everything local was.
    mockPrisma.business.findMany.mockResolvedValue([])
    mockDeleteUser.mockRejectedValue(new Error('Clerk unreachable'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(performAccountDeletion(USER)).resolves.toEqual({ kind: 'MEMBER_ONLY' })
    expect(consoleError).toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it('deletes local data before calling Clerk', async () => {
    // Ordering matters: if Clerk went first and the local delete then failed,
    // the user would be locked out of data that still exists.
    const order: string[] = []
    mockPrisma.business.findMany.mockResolvedValue([])
    mockPrisma.user.deleteMany.mockImplementation(async () => {
      order.push('local')
      return { count: 1 }
    })
    mockDeleteUser.mockImplementation(async () => {
      order.push('clerk')
    })

    await performAccountDeletion(USER)

    expect(order).toEqual(['local', 'clerk'])
  })
})
