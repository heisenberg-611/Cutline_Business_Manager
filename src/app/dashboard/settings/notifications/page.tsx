import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { SettingsSection } from '@/modules/settings/components/ui'
import { NotificationPreferencesEditor } from '@/modules/settings/components/NotificationPreferencesEditor'
// import { RealtimeMessagesEditor } from '@/modules/settings/components/RealtimeMessagesEditor'

export const metadata = {
  title: 'Notification Settings',
}

export default async function NotificationSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/dashboard/select-business')

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { notificationPreferences: true }
  })

  return (
    <div className="space-y-10">
      <SettingsSection title="Notifications & Sound" description="Configure tones and Do Not Disturb">
        <div className="p-6">
          <NotificationPreferencesEditor initialPreferences={user?.notificationPreferences as any} />
        </div>
      </SettingsSection>
      
      {/* 
      <SettingsSection title="Messaging Configuration" description="Manage organization-wide chat and notification settings">
        <div className="p-6">
          <RealtimeMessagesEditor initialEnabled={business?.realtimeMessagesEnabled} />
        </div>
      </SettingsSection> 
      */}
    </div>
  )
}
