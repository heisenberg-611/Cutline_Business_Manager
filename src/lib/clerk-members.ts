import prisma from '@/modules/core/db/prisma'

/**
 * Clerk is the source of truth for who is in an organisation; BusinessMembership
 * is a mirror of it, written by the organizationMembership webhook.
 *
 * That makes every member list in this app eventually consistent with an
 * unbounded lag: until the webhook lands, someone who joined is simply absent
 * from messaging, from @mentions and from the people you can add to a project.
 * A dropped or failed delivery leaves them absent indefinitely, with nothing to
 * notice it.
 *
 * These helpers close the gap by reading Clerk directly where a stale list is
 * actually visible.
 */

/**
 * Clerk's membership list is paginated and defaults to **10 per page**, so a
 * bare call silently truncates any organisation larger than that. Everything
 * here pages explicitly.
 */
const PAGE_SIZE = 100

export type ClerkMemberRow = {
  userId: string
  role: string
  email: string
  firstName: string
  lastName: string
}

/** Every membership in the organisation, following pagination to the end. */
export async function listClerkMembers(orgId: string): Promise<ClerkMemberRow[]> {
  const { clerkClient } = await import('@clerk/nextjs/server')
  const client = await clerkClient()

  const rows: ClerkMemberRow[] = []
  let offset = 0

  for (;;) {
    const page = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: PAGE_SIZE,
      offset,
    })

    for (const member of page.data) {
      const userId = member.publicUserData?.userId
      if (!userId) continue
      rows.push({
        userId,
        role: member.role,
        email: member.publicUserData?.identifier || '',
        firstName: member.publicUserData?.firstName || '',
        lastName: member.publicUserData?.lastName || '',
      })
    }

    offset += PAGE_SIZE
    if (page.data.length < PAGE_SIZE || offset >= page.totalCount) break
  }

  return rows
}

/**
 * Adds any Clerk membership this app has not mirrored yet.
 *
 * Additive only. Removals stay with the organizationMembership.deleted webhook:
 * a partial read here — a Clerk hiccup mid-pagination — would otherwise delete
 * people who are still members, and losing a member row cascades into losing
 * their access.
 *
 * Cheap when there is nothing to do: one Clerk read and one indexed query, no
 * writes. Callers await it, so the list they return is never missing someone
 * Clerk already knows about.
 */
export async function reconcileBusinessMembers(orgId: string): Promise<void> {
  let clerkMembers: ClerkMemberRow[]
  try {
    clerkMembers = await listClerkMembers(orgId)
  } catch (e) {
    // Best-effort: a Clerk outage must degrade to the mirror, not to an error
    // on a page whose job is to list people.
    console.error('[clerk-members] Could not read the membership list:', e)
    return
  }

  if (clerkMembers.length === 0) return

  const known = await prisma.businessMembership.findMany({
    where: { businessId: orgId },
    select: { userId: true },
  })
  const knownIds = new Set(known.map((m) => m.userId))

  const missing = clerkMembers.filter((m) => !knownIds.has(m.userId))
  if (missing.length === 0) return

  console.warn(
    '[clerk-members] Mirroring %d membership(s) the webhook has not delivered for %s',
    missing.length,
    orgId
  )

  for (const member of missing) {
    try {
      // The User row may be missing too, for the same reason.
      await prisma.user.upsert({
        where: { id: member.userId },
        update: {},
        create: {
          id: member.userId,
          email: member.email || `${member.userId}@placeholder.local`,
          firstName: member.firstName,
          lastName: member.lastName,
        },
      })

      await prisma.businessMembership.upsert({
        where: { businessId_userId: { businessId: orgId, userId: member.userId } },
        update: { role: member.role },
        create: { businessId: orgId, userId: member.userId, role: member.role },
      })
    } catch (e) {
      // One bad row — a duplicate email from a deleted Clerk user, say — must
      // not cost the rest of the list.
      console.error('[clerk-members] Could not mirror %s:', member.userId, e)
    }
  }
}
