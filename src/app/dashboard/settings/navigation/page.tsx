import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { SettingsSection } from '@/modules/settings/components/ui'
import { NavPreferencesEditor } from '@/modules/settings/components/NavPreferencesEditor'
import { QuickActionsEditor } from '@/modules/settings/components/QuickActionsEditor'

export const metadata = {
  title: 'Navigation Settings',
}

export default async function NavigationSettingsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/dashboard/select-business')

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { navPreferences: true, quickActionPreferences: true }
  })

  return (
    <div className="space-y-10">
      <SettingsSection title="Navigation Preferences" description="Reorder or hide items in your sidebar">
        <div className="p-6">
          <NavPreferencesEditor initialPreferences={user?.navPreferences as any} />
        </div>
      </SettingsSection>

      <SettingsSection title="Quick Actions" description="Customize the shortcuts under the + New button">
        <div className="p-6">
          <QuickActionsEditor initialPreferences={user?.quickActionPreferences as any} />
        </div>
      </SettingsSection>
    </div>
  )
}
