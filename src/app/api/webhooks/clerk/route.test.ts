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
  business: {
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    findUnique: vi.fn(),
  },
  adminAuditLog: { create: vi.fn() },
  user: { upsert: vi.fn(), deleteMany: vi.fn() },
  businessMembership: { upsert: vi.fn(), findUnique: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const mockDeleteMembership = vi.fn()
const mockUpdateOrganization = vi.fn()
const mockUpdateMembership = vi.fn()
const mockCreateMembership = vi.fn()
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: async () => ({
    organizations: {
      deleteOrganizationMembership: (...a: unknown[]) => mockDeleteMembership(...a),
      updateOrganization: (...a: unknown[]) => mockUpdateOrganization(...a),
      updateOrganizationMembership: (...a: unknown[]) => mockUpdateMembership(...a),
      createOrganizationMembership: (...a: unknown[]) => mockCreateMembership(...a),
    },
  }),
}))

vi.mock('@/lib/admin-notifications', () => ({ createAdminNotification: vi.fn() }))

const { POST } = await import('./route')

const ORG = 'org_1'
const OWNER = 'user_owner'
const INVITEE = 'user_invitee'

/** A membership.updated event changing `userId` to `role`. */
function membershipUpdated(userId: string, role: string) {
  verified = {
    type: 'organizationMembership.updated',
    data: {
      organization: { id: ORG, name: 'Acme' },
      role,
      public_user_data: { user_id: userId, identifier: 'x@test.local', first_name: 'X', last_name: 'Y' },
    },
  }
  return new Request('http://localhost/api/webhooks/clerk', { method: 'POST', body: '{}' })
}

/** A membership.deleted event removing `userId` from ORG. */
function membershipDeleted(userId: string) {
  verified = {
    type: 'organizationMembership.deleted',
    data: {
      organization: { id: ORG, name: 'Acme' },
      public_user_data: { user_id: userId },
    },
  }
  return new Request('http://localhost/api/webhooks/clerk', { method: 'POST', body: '{}' })
}

/** An organization.deleted event. */
function orgDeleted() {
  verified = { type: 'organization.deleted', data: { id: ORG } }
  return new Request('http://localhost/api/webhooks/clerk', { method: 'POST', body: '{}' })
}

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

describe('owner protection', () => {
  it('restores the owner when another admin demotes them', async () => {
    // Clerk has no owner concept beyond created_by, so any org:admin can demote
    // any other — including the person whose workspace it is. Combined with an
    // admin's ability to delete the organization, that is a full takeover.
    businessOn('BUSINESS')

    const res = await POST(membershipUpdated(OWNER, 'org:member'))

    expect(await res.json()).toMatchObject({ restored: 'owner_role' })
    expect(mockUpdateMembership).toHaveBeenCalledWith({
      organizationId: ORG,
      userId: OWNER,
      role: 'org:admin',
    })
    // The demotion must not be written; the restore's own webhook writes the
    // correct role.
    expect(mockPrisma.businessMembership.upsert).not.toHaveBeenCalled()
  })

  it('leaves a non-owner demotion alone', async () => {
    businessOn('BUSINESS')
    mockPrisma.businessMembership.findUnique.mockResolvedValue({ userId: INVITEE })

    await POST(membershipUpdated(INVITEE, 'org:member'))

    expect(mockUpdateMembership).not.toHaveBeenCalled()
    expect(mockPrisma.businessMembership.upsert).toHaveBeenCalled()
  })

  it('leaves an owner promotion alone', async () => {
    businessOn('BUSINESS')
    mockPrisma.businessMembership.findUnique.mockResolvedValue({ userId: OWNER })

    await POST(membershipUpdated(OWNER, 'org:admin'))

    expect(mockUpdateMembership).not.toHaveBeenCalled()
  })
})

describe('organization deletion', () => {
  it('marks the workspace instead of destroying it', async () => {
    // Deleting an organization in Clerk reaches none of the account-deletion
    // flow. Holding the data makes that single click recoverable.
    mockPrisma.business.findUnique.mockResolvedValue({ name: 'Acme', pendingDeletionAt: null })

    await POST(orgDeleted())

    expect(mockPrisma.business.deleteMany).not.toHaveBeenCalled()
    expect(mockPrisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { pendingDeletionAt: expect.any(Date) },
      })
    )
  })

  it('does not restart the clock on a repeated event', async () => {
    const alreadyMarked = new Date('2026-01-01')
    mockPrisma.business.findUnique.mockResolvedValue({ name: 'Acme', pendingDeletionAt: alreadyMarked })

    await POST(orgDeleted())

    expect(mockPrisma.business.update).not.toHaveBeenCalled()
  })
})

describe('owner removal', () => {
  it('restores the owner when another admin removes them', async () => {
    // The counterpart to demotion, reached by a different Clerk action. Left
    // unguarded it also mis-classified the ejected owner as a solo owner, free
    // to delete a workspace they were no longer in.
    mockPrisma.business.findUnique.mockResolvedValue({
      ownerUserId: OWNER,
      name: 'Acme',
      pendingDeletionAt: null,
    })

    const res = await POST(membershipDeleted(OWNER))

    expect(await res.json()).toMatchObject({ restored: 'owner_membership' })
    expect(mockCreateMembership).toHaveBeenCalledWith({
      organizationId: ORG,
      userId: OWNER,
      role: 'org:admin',
    })
    expect(mockPrisma.businessMembership.deleteMany).not.toHaveBeenCalled()
  })

  it('lets an ordinary member be removed', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({
      ownerUserId: OWNER,
      name: 'Acme',
      pendingDeletionAt: null,
    })

    await POST(membershipDeleted(INVITEE))

    expect(mockCreateMembership).not.toHaveBeenCalled()
    expect(mockPrisma.businessMembership.deleteMany).toHaveBeenCalled()
  })

  it('does not fight a workspace teardown', async () => {
    // During deletion every membership is expected to go, owner included.
    mockPrisma.business.findUnique.mockResolvedValue({
      ownerUserId: OWNER,
      name: 'Acme',
      pendingDeletionAt: new Date(),
    })

    await POST(membershipDeleted(OWNER))

    expect(mockCreateMembership).not.toHaveBeenCalled()
    expect(mockPrisma.businessMembership.deleteMany).toHaveBeenCalled()
  })
})
