import { AppLayout } from '@/modules/core/ui/AppLayout'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  let initialNavPreferences: { href: string; visible: boolean }[] | undefined = undefined
  let initialQuickActionPreferences: { id: string; visible: boolean }[] | undefined = undefined
  let initialNotificationPreferences: { tone: string; dnd: boolean } | undefined = undefined

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { navPreferences: true, quickActionPreferences: true, notificationPreferences: true }
    })
    
    if (user?.navPreferences) {
      initialNavPreferences = user.navPreferences as { href: string; visible: boolean }[]
    }
    if (user?.quickActionPreferences) {
      initialQuickActionPreferences = user.quickActionPreferences as { id: string; visible: boolean }[]
    }
    if (user?.notificationPreferences) {
      initialNotificationPreferences = user.notificationPreferences as { tone: string; dnd: boolean }
    }
  }

  return <AppLayout initialNavPreferences={initialNavPreferences} initialQuickActionPreferences={initialQuickActionPreferences} initialNotificationPreferences={initialNotificationPreferences}>{children}</AppLayout>
}
