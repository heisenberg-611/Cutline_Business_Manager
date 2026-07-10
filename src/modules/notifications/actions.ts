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

  return notification
}

export async function broadcastNotification(data: {
  businessId: string
  title: string
  message: string
  type?: string
  actionUrl?: string
}) {
  const { clerkClient } = await import("@clerk/nextjs/server")
  const client = await clerkClient()
  
  const members = await client.organizations.getOrganizationMembershipList({
    organizationId: data.businessId,
  })

  for (const member of members.data) {
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
    } catch (err) {
      console.error(`Failed to create notification for user ${userId}:`, err)
    }
  }
}

