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

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { navPreferences: true }
    })
    
    if (user?.navPreferences) {
      initialNavPreferences = user.navPreferences as { href: string; visible: boolean }[]
    }
  }

  return <AppLayout initialNavPreferences={initialNavPreferences}>{children}</AppLayout>
}
