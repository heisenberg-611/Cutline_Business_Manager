"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/modules/core/db/prisma"

/**
 * The list is capped, so the unread count has to be counted separately —
 * deriving it from the returned page silently maxed out at the page size.
 */
export async function getNotifications() {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    return { notifications: [], unreadCount: 0 }
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: {
        userId,
        businessId: orgId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50 // Limit to last 50 notifications
    }),
    prisma.notification.count({
      where: { userId, businessId: orgId, isRead: false }
    })
  ])

  return { notifications, unreadCount }
}

export async function markAsRead(notificationId: string) {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    throw new Error("Unauthorized")
  }

  await prisma.notification.update({
    where: {
      id: notificationId,
      userId, // Ensure they own it
      businessId: orgId
    },
    data: {
      isRead: true
    }
  })
}

export async function markAllAsRead() {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    throw new Error("Unauthorized")
  }

  await prisma.notification.updateMany({
    where: {
      userId,
      businessId: orgId,
      isRead: false
    },
    data: {
      isRead: true
    }
  })
}

export async function clearAllNotifications() {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    throw new Error("Unauthorized")
  }

  await prisma.notification.deleteMany({
    where: {
      userId,
      businessId: orgId
    }
  })
}


