import prisma from "@/modules/core/db/prisma"
import { sendPushNotification } from "@/lib/onesignal"
import * as Ably from "ably"
import { userNotificationsChannel, NOTIFICATION_EVENT, type NotificationPayload } from "@/lib/ably/channels"

/**
 * Nudges recipients' open tabs so the bell updates without polling.
 *
 * The bell used to poll every 15 seconds, which is one Vercel function
 * invocation per user per interval for something that is idle most of the time.
 * This carries no content — only the business it belongs to — so the client
 * refetches through the normal authorized path rather than trusting a payload
 * off a channel.
 *
 * Best-effort: a realtime failure must not fail the notification that has
 * already been written. Tabs still catch up when they regain focus.
 */
async function publishNotificationSignal(userIds: string[], businessId: string) {
  if (!process.env.ABLY_API_KEY || userIds.length === 0) return

  try {
    const ably = new Ably.Rest(process.env.ABLY_API_KEY)
    const payload: NotificationPayload = { businessId }
    await Promise.all(
      [...new Set(userIds)].map((userId) =>
        ably.channels.get(userNotificationsChannel(userId)).publish(NOTIFICATION_EVENT, payload)
      )
    )
  } catch (e) {
    console.error("Ably notification publish error:", e)
  }
}

export async function createNotification(data: {
  userId: string
  businessId: string
  title: string
  message: string
  type?: string
  actionUrl?: string
}) {
  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      businessId: data.businessId,
      title: data.title,
      message: data.message,
      type: data.type || "system",
      actionUrl: data.actionUrl,
      isRead: false
    }
  })

  // Send push notification synchronously alongside DB creation
  await sendPushNotification(
    data.title,
    data.message,
    [data.userId],
    data.actionUrl
  ).catch((err) => {
    console.error("Failed to push notification:", err)
  })

  await publishNotificationSignal([data.userId], data.businessId)

  return notification
}

/**
 * Notifies people in a business.
 *
 * `audience` is explicit because the two cases are genuinely different: some
 * broadcasts are about work anyone on the team should see, others are about an
 * action only an admin can take. This previously always skipped non-admins,
 * which contradicted every call site's "notify business members" comment and
 * meant members received no broadcasts at all.
 */
export async function broadcastNotification(data: {
  businessId: string
  title: string
  message: string
  type?: string
  actionUrl?: string
  audience?: 'all' | 'admins'
}) {
  const audience = data.audience ?? 'all'

  const { clerkClient } = await import("@clerk/nextjs/server")
  const client = await clerkClient()

  const members = await client.organizations.getOrganizationMembershipList({
    organizationId: data.businessId,
  })

  const targetUserIds: string[] = []

  for (const member of members.data) {
    if (audience === 'admins' && member.role !== 'org:admin') continue

    const userId = member.publicUserData?.userId
    if (!userId) continue

    try {
      // 1. Ensure user exists in Prisma to satisfy foreign keys
      let email = member.publicUserData?.identifier || ''
      try {
        await prisma.user.upsert({
          where: { id: userId },
          update: {
            email,
            firstName: member.publicUserData?.firstName || '',
            lastName: member.publicUserData?.lastName || '',
          },
          create: {
            id: userId,
            email,
            firstName: member.publicUserData?.firstName || '',
            lastName: member.publicUserData?.lastName || '',
          }
        })
      } catch (upsertError: any) {
        // If there is a unique constraint violation on email (e.g. from an old deleted clerk user)
        if (upsertError.code === 'P2002') {
          const fallbackEmail = `${userId}@fallback.local`
          await prisma.user.upsert({
            where: { id: userId },
            update: {
              email: fallbackEmail,
              firstName: member.publicUserData?.firstName || '',
              lastName: member.publicUserData?.lastName || '',
            },
            create: {
              id: userId,
              email: fallbackEmail,
              firstName: member.publicUserData?.firstName || '',
              lastName: member.publicUserData?.lastName || '',
            }
          })
        } else {
          throw upsertError
        }
      }

      // 2. Ensure business membership exists
      await prisma.businessMembership.upsert({
        where: {
          businessId_userId: {
            businessId: data.businessId,
            userId: userId
          }
        },
        update: {
          role: member.role
        },
        create: {
          businessId: data.businessId,
          userId: userId,
          role: member.role
        }
      })

      // 3. Create notification
      await prisma.notification.create({
        data: {
          userId,
          businessId: data.businessId,
          title: data.title,
          message: data.message,
          type: data.type || "system",
          actionUrl: data.actionUrl,
          isRead: false
        }
      })
      
      targetUserIds.push(userId)
    } catch (err) {
      console.error(`Failed to create notification for user ${userId}:`, err)
    }
  }

  if (targetUserIds.length > 0) {
    await sendPushNotification(
      data.title,
      data.message,
      targetUserIds,
      data.actionUrl
    ).catch((err) => {
      console.error("Failed to broadcast push notifications:", err)
    })

    // This writes rows directly rather than going through createNotification,
    // so it has to raise the signal itself.
    await publishNotificationSignal(targetUserIds, data.businessId)
  }
}

export async function createManyNotifications(
  userIds: string[],
  data: {
    businessId: string
    title: string
    message: string
    type?: string
    actionUrl?: string
  },
  tx?: any
) {
  if (userIds.length === 0) return;
  
  const client = tx || prisma;

  await client.notification.createMany({
    data: userIds.map(userId => ({
      userId,
      businessId: data.businessId,
      title: data.title,
      message: data.message,
      type: data.type || "system",
      actionUrl: data.actionUrl,
      isRead: false
    }))
  })

  await sendPushNotification(
    data.title,
    data.message,
    userIds,
    data.actionUrl
  ).catch((err) => {
    console.error("Failed to push notifications:", err)
  })

  await publishNotificationSignal(userIds, data.businessId)
}
