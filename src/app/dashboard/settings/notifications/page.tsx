import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { SettingsSection } from '@/modules/settings/components/ui'
import { NotificationPreferencesEditor } from '@/modules/settings/components/NotificationPreferencesEditor'
import { ReactionEmojiEditor } from '@/modules/settings/components/ReactionEmojiEditor'
import { emojiSetOf } from '@/modules/reactions/reactions'
// import { RealtimeMessagesEditor } from '@/modules/settings/components/RealtimeMessagesEditor'

export const metadata = {
  title: 'Notification Settings',
}

export default async function NotificationSettingsPage() {
  const { userId, orgId, orgRole } = await auth()
  if (!userId) redirect('/dashboard/select-business')

  const isAdmin = orgRole === 'org:admin'

  const [user, business] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true }
    }),
    // Only an admin can change the set, so only they need it here.
    isAdmin && orgId
      ? prisma.business.findUnique({
          where: { id: orgId },
          select: { reactionEmojis: true }
        })
      : Promise.resolve(null),
  ])

  return (
    <div className="space-y-10">
      <SettingsSection title="Notifications & Sound" description="Configure tones and Do Not Disturb">
        <div className="p-6">
          <NotificationPreferencesEditor initialPreferences={user?.notificationPreferences as any} />
        </div>
      </SettingsSection>
      
      {isAdmin && (
        <SettingsSection
          title="Reactions"
          description="The emoji your team can react with, in messages and project discussions"
        >
          <div className="p-6">
            <ReactionEmojiEditor initialEmojis={emojiSetOf(business)} />
          </div>
        </SettingsSection>
      )}

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
