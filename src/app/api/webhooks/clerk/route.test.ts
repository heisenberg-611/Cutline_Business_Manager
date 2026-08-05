import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.CLERK_WEBHOOK_SECRET = 'whsec_test'

/** The event the verifier will return for a given request. */
let verified: unknown

vi.mock('svix', () => ({
  Webhook: class {
    verify() {
      return verified
    }
  },
}))

vi.mock('next/headers', () => ({
  headers: async () => new Map(
    Object.entries({
      'svix-id': 'msg_1',
      'svix-timestamp': '1',
      'svix-signature': 'v1,sig',
    })
  ),
}))

const mockPrisma = {
  globalSettings: { findUnique: vi.fn() },
  business: { upsert: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
  user: { upsert: vi.fn(), deleteMany: vi.fn() },
  businessMembership: { upsert: vi.fn(), findUnique: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const mockDeleteMembership = vi.fn()
const mockUpdateOrganization = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({
    organizations: {
      deleteOrganizationMembership: (...a: unknown[]) => mockDeleteMembership(...a),
      updateOrganization: (...a: unknown[]) => mockUpdateOrganization(...a),
    },
  }),
}))

const { POST } = await import('./route')

const ORG = 'org_1'
const OWNER = 'user_owner'
const INVITEE = 'user_invitee'

/** A membership.created event for `userId` joining ORG. */
function membershipCreated(userId: string) {
  verified = {
    type: 'organizationMembership.created',
    data: {
      organization: { id: ORG, name: 'Acme' },
      role: 'org:member',
      public_user_data: { user_id: userId, identifier: 'x@test.local', first_name: 'X', last_name: 'Y' },
    },
  }
  return new Request('http://localhost/api/webhooks/clerk', { method: 'POST', body: '{}' })
}

/** The business the webhook will find, on `plan` with `owner`. */
function businessOn(plan: string, owner: string | null = OWNER) {
  mockPrisma.business.upsert.mockResolvedValue({
    id: ORG,
    subscriptionPlan: plan,
    subscriptionPeriodEnd: null,
    ownerUserId: owner,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mockPrisma.globalSettings.findUnique.mockResolvedValue({ defaultPlanId: 'FREE' })
  mockPrisma.businessMembership.findUnique.mockResolvedValue(null)
  mockPrisma.businessMembership.count.mockResolvedValue(1)
})

describe('clerk webhook seat backstop', () => {
  it('revokes a non-owner joining a Free organization', async () => {
    businessOn('FREE')

    const res = await POST(membershipCreated(INVITEE))

    expect(await res.json()).toMatchObject({ revoked: 'over_seat_limit' })
    expect(mockDeleteMembership).toHaveBeenCalledWith({ organizationId: ORG, userId: INVITEE })
    // The row must not exist, or the app would treat them as a real member.
    expect(mockPrisma.businessMembership.upsert).not.toHaveBeenCalled()
  })

  it('lets a non-owner join a Business organization', async () => {
    businessOn('BUSINESS')

    await POST(membershipCreated(INVITEE))

    expect(mockDeleteMembership).not.toHaveBeenCalled()
    expect(mockPrisma.businessMembership.upsert).toHaveBeenCalled()
  })

  it('never revokes the owner, even on Free', async () => {
    businessOn('FREE')

    await POST(membershipCreated(OWNER))

    expect(mockDeleteMembership).not.toHaveBeenCalled()
    expect(mockPrisma.businessMembership.upsert).toHaveBeenCalled()
  })

  it('treats an expired Business plan as Free', async () => {
    mockPrisma.business.upsert.mockResolvedValue({
      id: ORG,
      subscriptionPlan: 'BUSINESS',
      subscriptionPeriodEnd: new Date(Date.now() - 86_400_000),
      ownerUserId: OWNER,
    })

    await POST(membershipCreated(INVITEE))

    expect(mockDeleteMembership).toHaveBeenCalled()
  })

  it('admits the founding member when the owner is not yet backfilled', async () => {
    businessOn('FREE', null)
    mockPrisma.businessMembership.count.mockResolvedValue(0)

    await POST(membershipCreated(INVITEE))

    expect(mockDeleteMembership).not.toHaveBeenCalled()
    expect(mockPrisma.businessMembership.upsert).toHaveBeenCalled()
  })

  it('leaves an existing membership alone, so a role change is not an eviction', async () => {
    businessOn('FREE')
    mockPrisma.businessMembership.findUnique.mockResolvedValue({ userId: INVITEE })

    await POST(membershipCreated(INVITEE))

    expect(mockDeleteMembership).not.toHaveBeenCalled()
    expect(mockPrisma.businessMembership.upsert).toHaveBeenCalled()
  })

  it('still denies the membership when Clerk refuses the revoke, and does not 500', async () => {
    // A 500 would make Clerk redeliver forever. Denying the row is the part
    // that actually keeps them out.
    businessOn('FREE')
    mockDeleteMembership.mockRejectedValue(new Error('Not Found'))

    const res = await POST(membershipCreated(INVITEE))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ revoked: 'membership_denied' })
    expect(mockPrisma.businessMembership.upsert).not.toHaveBeenCalled()
  })
})
