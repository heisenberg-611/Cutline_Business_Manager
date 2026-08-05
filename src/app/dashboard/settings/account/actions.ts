'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/modules/core/db/prisma'
import { classifyDeletion, performAccountDeletion, DeletionBlockedError } from '@/lib/account-deletion'
import { createAdminNotification } from '@/lib/admin-notifications'

const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 2000

/** The request currently in flight, if any. */
export async function getMyDeletionRequest() {
  const { userId } = await auth()
  if (!userId) return null

  return prisma.accountDeletionRequest.findFirst({
    where: { userId, status: { in: ['AWAITING_DATA', 'DATA_DELIVERED'] } },
    orderBy: { requestedAt: 'desc' },
  })
}

export async function requestAccountDeletion(reason: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  const trimmed = (reason ?? '').trim()
  if (trimmed.length < MIN_REASON_LENGTH) {
    return { success: false, error: `Please tell us a little more — at least ${MIN_REASON_LENGTH} characters.` }
  }
  if (trimmed.length > MAX_REASON_LENGTH) {
    return { success: false, error: 'That reason is too long.' }
  }

  // Checked before accepting the request, not only at the end. Telling someone
  // their workspace is shared after they have waited days for an export would
  // be a poor way to find out.
  const scope = await classifyDeletion(userId)
  if (scope.kind === 'SHARED_OWNER') {
    return {
      success: false,
      error: `You own ${scope.businessName}, which ${scope.otherMembers} other ${
        scope.otherMembers === 1 ? 'person is' : 'people are'
      } still a member of. Transfer ownership or remove them before deleting your account.`,
    }
  }

  const existing = await prisma.accountDeletionRequest.findFirst({
    where: { userId, status: { in: ['AWAITING_DATA', 'DATA_DELIVERED'] } },
  })
  if (existing) {
    return { success: false, error: 'You already have a deletion request in progress.' }
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })

  await prisma.accountDeletionRequest.create({
    data: { userId, userEmail: user?.email ?? null, reason: trimmed },
  })

  // Nothing progresses until an admin sends the export, so they have to know.
  await createAdminNotification({
    title: 'Account deletion requested',
    message: `${user?.email ?? userId} asked to delete their account. Send their data export to proceed.`,
    type: 'account_deletion',
    actionUrl: '/hq/deletions',
  })

  revalidatePath('/dashboard/settings/account')
  return { success: true }
}

export async function cancelAccountDeletion() {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  await prisma.accountDeletionRequest.updateMany({
    where: { userId, status: { in: ['AWAITING_DATA', 'DATA_DELIVERED'] } },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })

  revalidatePath('/dashboard/settings/account')
  return { success: true }
}

/**
 * Completes the deletion.
 *
 * Refuses unless an admin has confirmed the data export was delivered. That
 * ordering is the point of the whole flow: nobody should be able to destroy
 * their records before receiving a copy of them, including by accident.
 */
export async function deleteMyAccount(confirmation: string) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  if (confirmation !== 'DELETE') {
    return { success: false, error: 'Type DELETE to confirm.' }
  }

  const request = await prisma.accountDeletionRequest.findFirst({
    where: { userId, status: 'DATA_DELIVERED' },
    orderBy: { requestedAt: 'desc' },
  })

  if (!request) {
    return {
      success: false,
      error: 'Your data export has not been delivered yet. You can delete your account once it arrives.',
    }
  }

  try {
    await performAccountDeletion(userId)
  } catch (error) {
    if (error instanceof DeletionBlockedError) {
      return { success: false, error: error.message }
    }
    throw error
  }

  // Kept as evidence the request was made and honoured, stripped of anything
  // identifying — the promise was that no copies of their data remain.
  await prisma.accountDeletionRequest.update({
    where: { id: request.id },
    data: { status: 'COMPLETED', completedAt: new Date(), userId: null, userEmail: null },
  })

  return { success: true }
}
