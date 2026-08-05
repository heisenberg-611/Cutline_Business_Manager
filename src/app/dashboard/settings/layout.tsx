import { auth } from '@clerk/nextjs/server'
import { SettingsSidebarNav } from '@/modules/settings/components/SettingsSidebarNav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  // Read on the server so a member never sees a flash of links that middleware
  // will bounce them off.
  const { orgRole } = await auth()
  const isAdmin = orgRole === 'org:admin'

  return (
    <div className="max-w-6xl w-full mx-auto pb-24">
      <div className="border-b border-zinc-200 dark:border-white/10 pb-5 mb-8">
        <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
          Settings
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          {isAdmin
            ? 'Manage your studio configuration, plan, and preferences.'
            : 'Manage your personal preferences.'}
        </p>
      </div>
      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:items-start">
        <SettingsSidebarNav isAdmin={isAdmin} />
        <div className="mt-8 lg:mt-0 min-w-0">{children}</div>
      </div>
    </div>
  )
}
