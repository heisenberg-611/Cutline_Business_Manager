import prisma from '@/modules/core/db/prisma'

/**
 * Account deletion: deciding what "delete my account" means for a given person,
 * and carrying it out.
 *
 * The decision is not obvious in this product because business data hangs off
 * Business, not User. Deleting the user row alone cascades only memberships,
 * notifications and mentions — every client, project and invoice would survive.
 * Since most accounts are the sole member of their own workspace, that would
 * make the "no copies remain" promise shown to the user false.
 */

export type DeletionScope =
  /** Sole member of the workspace they own: the workspace is theirs to erase. */
  | { kind: 'SOLO_OWNER'; businessId: string; businessName: string }
  /** Owns a workspace other people still work in. Refused. */
  | {
      kind: 'SHARED_OWNER'
      businessName: string
      otherMembers: number
      /** Who to remove. A bare count leaves the owner guessing at the work. */
      memberNames: string[]
    }
  /** Belongs to workspaces they do not own: only the person is removed. */
  | { kind: 'MEMBER_ONLY' }

/**
 * Works out which of the three cases applies, without changing anything.
 * Separated from the deletion itself so the UI can explain the consequence
 * before the user commits to it.
 */
export async function classifyDeletion(userId: string): Promise<DeletionScope> {
  const ownedBusinesses = await prisma.business.findMany({
    where: { ownerUserId: userId },
    select: {
      id: true,
      name: true,
      _count: { select: { memberships: true } },
      memberships: {
        where: { userId: { not: userId } },
        select: { user: { select: { firstName: true, lastName: true, email: true } } },
        take: 20,
      },
    },
  })

  // A workspace with anyone else in it is not this person's to delete. Refusing
  // is the whole point: one departing owner must not be able to erase the
  // clients, projects and invoices their colleagues depend on.
  const shared = ownedBusinesses.find((b) => b._count.memberships > 1)
  if (shared) {
    return {
      kind: 'SHARED_OWNER',
      businessName: shared.name,
      otherMembers: shared._count.memberships - 1,
      memberNames: shared.memberships.map((m) => {
        const name = [m.user.firstName, m.user.lastName].filter(Boolean).join(' ').trim()
        return name || m.user.email
      }),
    }
  }

  const solo = ownedBusinesses[0]
  if (solo) {
    return { kind: 'SOLO_OWNER', businessId: solo.id, businessName: solo.name }
  }

  return { kind: 'MEMBER_ONLY' }
}

export class DeletionBlockedError extends Error {
  readonly scope: DeletionScope

  constructor(scope: DeletionScope, message: string) {
    super(message)
    this.name = 'DeletionBlockedError'
    this.scope = scope
  }
}

/**
 * Permanently deletes the account and, for a solo workspace, everything in it.
 *
 * Ordering is deliberate. Local rows go first: if Clerk fails afterwards the
 * user can no longer reach any data, and the request stays open so it can be
 * retried. Deleting from Clerk first would leave a signed-out user whose data
 * is still present and now unreachable by them.
 *
 * Clerk failures are logged rather than thrown for the same reason — the
 * destructive half has already succeeded and re-running must remain safe.
 */
export async function performAccountDeletion(userId: string): Promise<DeletionScope> {
  const scope = await classifyDeletion(userId)

  if (scope.kind === 'SHARED_OWNER') {
    throw new DeletionBlockedError(
      scope,
      `You own ${scope.businessName}, which ${scope.otherMembers} other ${
        scope.otherMembers === 1 ? 'person is' : 'people are'
      } still a member of. Transfer ownership or remove them before deleting your account.`
    )
  }

  if (scope.kind === 'SOLO_OWNER') {
    // Every one of the 23 business-owned models cascades from here: clients,
    // projects, tasks, comments, invoices, payments, expenses, credit notes,
    // assets, messages, feedback and testimonials.
    await prisma.business.delete({ where: { id: scope.businessId } })
  }

  // Memberships of workspaces they did not own. Assigned projects and tasks are
  // set null by their existing foreign keys rather than deleted, because that
  // work belongs to the workspace.
  await prisma.businessMembership.deleteMany({ where: { userId } })
  await prisma.user.deleteMany({ where: { id: userId } })

  try {
    const { clerkClient } = await import('@clerk/nextjs/server')
    const client = await clerkClient()

    if (scope.kind === 'SOLO_OWNER') {
      await client.organizations.deleteOrganization(scope.businessId)
    }

    await client.users.deleteUser(userId)
  } catch (error) {
    console.error(
      `[account-deletion] Local data for ${userId} is deleted but Clerk cleanup failed:`,
      error
    )
  }

  return scope
}
