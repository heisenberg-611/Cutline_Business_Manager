import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthorizeEntityAccess = vi.fn()
vi.mock('../authz', () => ({
  authorizeEntityAccess: (...args: unknown[]) => mockAuthorizeEntityAccess(...args),
  requireSession: vi.fn(),
}))

const mockMentionableUserIds = vi.fn()
vi.mock('../mentionable', () => ({
  mentionableUserIds: (...args: unknown[]) => mockMentionableUserIds(...args),
  mentionableUsersForProject: vi.fn(),
}))

const mockCreateNotification = vi.fn()
vi.mock('@/modules/notifications/services', () => ({
  createNotification: (...args: unknown[]) => mockCreateNotification(...args),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const mockPrisma = {
  comment: { findFirst: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
  user: { findUnique: vi.fn() },
}
vi.mock('@/modules/core/db/prisma', () => ({ default: mockPrisma }))

const { createComment } = await import('./comments')

const ME = 'user_me'
const OTHER = 'user_other'
const THIRD = 'user_third'

/** Recipients of the notifications raised by the call. */
const notified = () => mockCreateNotification.mock.calls.map((c) => c[0].userId as string)
const titleFor = (userId: string) =>
  mockCreateNotification.mock.calls.find((c) => c[0].userId === userId)?.[0].title as string

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthorizeEntityAccess.mockResolvedValue({ userId: ME, orgId: 'org_1', isAdmin: false })
  mockMentionableUserIds.mockResolvedValue(new Set([ME, OTHER, THIRD]))
  mockPrisma.comment.create.mockResolvedValue({ id: 'comment_new' })
  mockPrisma.user.findUnique.mockResolvedValue({
    firstName: 'Ada',
    lastName: 'Reyes',
    email: 'ada@test.local',
  })
})

/** A parent comment written by `authorId`. */
function parentBy(authorId: string | null, extra: Record<string, unknown> = {}) {
  mockPrisma.comment.findFirst.mockResolvedValue({
    id: 'comment_parent',
    parentId: null,
    authorId,
    deletedAt: null,
    ...extra,
  })
}

describe('createComment — replies', () => {
  // The reported bug: replying to someone told them nothing.
  it('notifies the person being replied to', async () => {
    parentBy(OTHER)
    await createComment({
      entityType: 'Project',
      entityId: 'proj_1',
      body: 'Sounds good',
      parentId: 'comment_parent',
    })

    expect(notified()).toEqual([OTHER])
    expect(titleFor(OTHER)).toMatch(/replied to you/)
  })

  it('does not notify you for replying to yourself', async () => {
    parentBy(ME)
    await createComment({
      entityType: 'Project',
      entityId: 'proj_1',
      body: 'Adding to my own point',
      parentId: 'comment_parent',
    })

    expect(notified()).toEqual([])
  })

  // One comment should never produce two notifications for the same person.
  it('sends one notification when a reply also mentions that person', async () => {
    parentBy(OTHER)
    await createComment({
      entityType: 'Project',
      entityId: 'proj_1',
      body: `Yes @[Other](${OTHER}) exactly`,
      parentId: 'comment_parent',
    })

    expect(notified()).toEqual([OTHER])
    // A mention is the more specific action, so it wins the wording.
    expect(titleFor(OTHER)).toMatch(/mentioned you/)
  })

  it('notifies both the person replied to and a different person mentioned', async () => {
    parentBy(OTHER)
    await createComment({
      entityType: 'Project',
      entityId: 'proj_1',
      body: `Good point — @[Third](${THIRD}) can you check?`,
      parentId: 'comment_parent',
    })

    expect(notified().sort()).toEqual([OTHER, THIRD].sort())
    expect(titleFor(THIRD)).toMatch(/mentioned you/)
    expect(titleFor(OTHER)).toMatch(/replied to you/)
  })

  // Someone removed from the project should not be pointed at a page that will
  // refuse them on arrival.
  it('does not notify a parent author who has lost access', async () => {
    parentBy(OTHER)
    mockMentionableUserIds.mockResolvedValue(new Set([ME, THIRD]))

    await createComment({
      entityType: 'Project',
      entityId: 'proj_1',
      body: 'Replying anyway',
      parentId: 'comment_parent',
    })

    expect(notified()).toEqual([])
  })

  it('does not notify for a reply to a deleted comment', async () => {
    parentBy(OTHER, { deletedAt: new Date() })
    await createComment({
      entityType: 'Project',
      entityId: 'proj_1',
      body: 'Hello?',
      parentId: 'comment_parent',
    })

    expect(notified()).toEqual([])
  })

  // Threads are one level deep, so a reply-to-a-reply re-parents to the root —
  // but the person notified must still be whoever wrote the reply.
  it('notifies the author of the reply being answered, not the thread starter', async () => {
    mockPrisma.comment.findFirst.mockResolvedValue({
      id: 'comment_reply',
      parentId: 'comment_root',
      authorId: THIRD,
      deletedAt: null,
    })

    await createComment({
      entityType: 'Project',
      entityId: 'proj_1',
      body: 'Agreed',
      parentId: 'comment_reply',
    })

    expect(notified()).toEqual([THIRD])
    // Re-parented to the root so the thread stays flat.
    expect(mockPrisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ parentId: 'comment_root' }) })
    )
  })

  it('notifies nobody for a top-level comment with no mentions', async () => {
    await createComment({ entityType: 'Project', entityId: 'proj_1', body: 'Just a note' })
    expect(notified()).toEqual([])
  })
})
