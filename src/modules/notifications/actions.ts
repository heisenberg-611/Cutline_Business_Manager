"use server"

import { auth } from "@clerk/nextjs/server"
import prisma from "@/modules/core/db/prisma"

export async function getNotifications() {
  const { userId, orgId } = await auth()

  if (!userId || !orgId) {
    return []
  }

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      businessId: orgId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50 // Limit to last 50 notifications
  })

  return notifications
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


