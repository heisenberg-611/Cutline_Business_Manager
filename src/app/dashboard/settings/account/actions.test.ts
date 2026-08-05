import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = {
  accountDeletionRequest: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  user: { findUnique: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const mockAuth = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({ auth: () => mockAuth() }))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/admin-notifications', () => ({ createAdminNotification: vi.fn() }))

const mockClassify = vi.fn()
const mockPerform = vi.fn()
vi.mock('@/lib/account-deletion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/account-deletion')>(
    '@/lib/account-deletion'
  )
  return {
    ...actual,
    classifyDeletion: (...a: unknown[]) => mockClassify(...a),
    performAccountDeletion: (...a: unknown[]) => mockPerform(...a),
  }
})

const { requestAccountDeletion, deleteMyAccount } = await import('./actions')

const USER = 'user_1'

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.mockResolvedValue({ userId: USER })
  mockClassify.mockResolvedValue({ kind: 'MEMBER_ONLY' })
  mockPrisma.user.findUnique.mockResolvedValue({ email: 'leaver@test.local' })
  mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue(null)
  mockPrisma.accountDeletionRequest.create.mockResolvedValue({ id: 'req_1' })
  mockPrisma.accountDeletionRequest.update.mockResolvedValue({})
})

describe('requestAccountDeletion', () => {
  it('requires a substantive reason', async () => {
    const result = await requestAccountDeletion('nope')

    expect(result.success).toBe(false)
    expect(mockPrisma.accountDeletionRequest.create).not.toHaveBeenCalled()
  })

  it('records the reason and the email', async () => {
    const result = await requestAccountDeletion('  Moving to another tool this quarter.  ')

    expect(result.success).toBe(true)
    expect(mockPrisma.accountDeletionRequest.create).toHaveBeenCalledWith({
      data: {
        userId: USER,
        userEmail: 'leaver@test.local',
        reason: 'Moving to another tool this quarter.',
      },
    })
  })

  it('refuses up front when the workspace has other members', async () => {
    // Better to say so now than after they have waited days for an export.
    mockClassify.mockResolvedValue({
      kind: 'SHARED_OWNER',
      businessName: 'Agency',
      otherMembers: 2,
    })

    const result = await requestAccountDeletion('Leaving the industry entirely.')

    expect(result.success).toBe(false)
    expect(result.error).toContain('Agency')
    expect(mockPrisma.accountDeletionRequest.create).not.toHaveBeenCalled()
  })

  it('refuses a second concurrent request', async () => {
    mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue({ id: 'existing' })

    const result = await requestAccountDeletion('Changed my mind again about leaving.')

    expect(result.success).toBe(false)
    expect(mockPrisma.accountDeletionRequest.create).not.toHaveBeenCalled()
  })
})

describe('deleteMyAccount', () => {
  it('refuses without the typed confirmation', async () => {
    const result = await deleteMyAccount('delete')

    expect(result.success).toBe(false)
    expect(mockPerform).not.toHaveBeenCalled()
  })

  it('refuses until the data export has been delivered', async () => {
    // The central rule of the whole flow: nobody destroys their records before
    // receiving a copy of them.
    mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue(null)

    const result = await deleteMyAccount('DELETE')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not been delivered')
    expect(mockPerform).not.toHaveBeenCalled()

    // Asserted on the query itself, not just the outcome. With findFirst
    // mocked, dropping the status filter would still return null and this test
    // would pass while the gate was gone — which it did, until this line.
    expect(mockPrisma.accountDeletionRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'DATA_DELIVERED' }),
      })
    )
  })

  it('deletes once delivery is confirmed, then strips the identity from the record', async () => {
    mockPrisma.accountDeletionRequest.findFirst.mockResolvedValue({
      id: 'req_1',
      status: 'DATA_DELIVERED',
    })
    mockPerform.mockResolvedValue({ kind: 'MEMBER_ONLY' })

    const result = await deleteMyAccount('DELETE')

    expect(result.success).toBe(true)
    expect(mockPerform).toHaveBeenCalledWith(USER)

    // The audit row survives, but holding nothing that identifies them.
    expect(mockPrisma.accountDeletionRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          userId: null,
          userEmail: null,
        }),
      })
    )
  })
})
