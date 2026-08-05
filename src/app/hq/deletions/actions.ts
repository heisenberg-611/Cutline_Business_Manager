'use server'

import { Resend } from 'resend'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '../actions'
import { collectUserData } from '@/lib/user-export/collect'
import { renderUserExportHtml } from '@/lib/user-export/render-html'

/**
 * Emails the data export and records that it was delivered.
 *
 * These are one action on purpose. dataDeliveredAt is what unlocks the user's
 * delete button, so it must never be settable without the export having
 * actually been sent — otherwise an admin could, by a slip, let someone destroy
 * records they never received a copy of.
 */
export async function sendExportAndMarkDelivered(requestId: string) {
  const admin = await requireAdmin() // SECURITY CHECK

  const request = await prisma.accountDeletionRequest.findUnique({ where: { id: requestId } })
  if (!request) return { success: false, error: 'Request not found' }
  if (request.status !== 'AWAITING_DATA') {
    return { success: false, error: 'This request is not awaiting data.' }
  }
  if (!request.userId || !request.userEmail) {
    return { success: false, error: 'This request has no user attached.' }
  }

  if (!process.env.RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY is not configured — cannot send the export.' }
  }

  const bundle = await collectUserData(request.userId)
  if (!bundle) return { success: false, error: 'Could not collect data for that user.' }

  const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' } })
  const html = renderUserExportHtml(bundle, { supportEmail: settings?.supportEmail })

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: 'privacy@cutlin.tech',
      to: request.userEmail,
      subject: 'Your Cutline data export',
      html,
    })
    // Resend reports failures in the response rather than by throwing, so this
    // has to be checked explicitly or a bounced export would be marked
    // delivered and unlock deletion.
    if (error) {
      return { success: false, error: `Resend rejected the email: ${error.message}` }
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to send the export email',
    }
  }

  await prisma.accountDeletionRequest.update({
    where: { id: requestId },
    data: {
      status: 'DATA_DELIVERED',
      dataDeliveredAt: new Date(),
      deliveredBy: admin.email,
    },
  })

  // Tells them in-app that the export has arrived and deletion is now open to
  // them. Notification requires a business, so it is scoped to one they belong
  // to; someone with no membership simply gets the email, which is the primary
  // channel anyway. Failures here must never undo a delivered export.
  try {
    const membership = await prisma.businessMembership.findFirst({
      where: { userId: request.userId },
      select: { businessId: true },
    })

    if (membership) {
      await prisma.notification.create({
        data: {
          userId: request.userId,
          businessId: membership.businessId,
          title: 'Your data export has been sent',
          message:
            'We have emailed a complete copy of your data. You can now permanently delete your account from Settings → Account.',
          type: 'account',
          actionUrl: '/dashboard/settings/account',
        },
      })
    }
  } catch (e) {
    console.error('[deletions] Could not create user notification:', e)
  }

  await prisma.adminAuditLog.create({
    data: {
      adminEmail: admin.email,
      action: 'DELIVER_USER_DATA_EXPORT',
      targetId: request.userId,
      metadata: { requestId, sections: bundle.sections.length },
    },
  })

  revalidatePath('/hq/deletions')
  return { success: true }
}
