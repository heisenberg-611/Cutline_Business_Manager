import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { PipelineStagesEditor } from '@/modules/settings/components/PipelineStagesEditor'
import { CurrencySelector } from '@/modules/settings/components/CurrencySelector'
import { Building2, Workflow, DollarSign, Mail, Layout, Zap, BellRing, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { BusinessNameEditor } from '@/modules/settings/components/BusinessNameEditor'
import { NavPreferencesEditor } from '@/modules/settings/components/NavPreferencesEditor'
import { QuickActionsEditor } from '@/modules/settings/components/QuickActionsEditor'
import { NotificationPreferencesEditor } from '@/modules/settings/components/NotificationPreferencesEditor'
import { WorkflowPresetSelector } from '@/modules/settings/components/WorkflowPresetSelector'
import { RealtimeMessagesEditor } from '@/modules/settings/components/RealtimeMessagesEditor'

import { ensureDefaultTemplate } from '@/modules/workflow/actions'

export const metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const { orgId, userId } = await auth()
  if (!orgId || !userId) redirect('/dashboard/select-business')

  const [business, template, user] = await Promise.all([
    prisma.business.findUnique({ where: { id: orgId } }),
    ensureDefaultTemplate(orgId),
    prisma.user.findUnique({ where: { id: userId } }),
  ])

  if (!business) redirect('/dashboard/select-business')

  return (
    <div className="max-w-7xl w-full mx-auto pb-24 space-y-8 md:space-y-12">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-white/10 pb-5">
        <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
          Settings
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          Manage your studio configuration, pipeline stages, and preferences.
        </p>
      </div>

      {/* ROW 1: General Settings (3 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Business Info */}
        <section className="space-y-4 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
              <Building2 className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Business Profile</h4>
              <p className="text-xs text-zinc-500">Your studio identity and branding</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6 flex-1 flex flex-col justify-center">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Business Name</label>
            <BusinessNameEditor currentName={business.name} />
            <p className="text-[11px] text-zinc-400 mt-3 leading-relaxed">This is your official Clerk Organization name. Updating it will automatically sync across the platform.</p>
          </div>
        </section>

        {/* Currency */}
        <section className="space-y-4 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
              <DollarSign className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Default Currency</h4>
              <p className="text-xs text-zinc-500">Used for invoices and financials</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6 flex-1 flex flex-col justify-center">
            <CurrencySelector currentCurrency={business.defaultCurrency} />
          </div>
        </section>

        {/* Invoice & Email Settings */}
        <section className="space-y-4 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
              <Mail className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Invoice & Email</h4>
              <p className="text-xs text-zinc-500">Customize templates and prefixes</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6 flex-1 flex flex-col justify-center space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Manage Templates</p>
              <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">Setup dynamic placeholders and custom invoice numbering formats.</p>
            </div>
            <Link href="/dashboard/settings/invoice" className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow transition-colors hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90 w-full">
              Configure
            </Link>
          </div>
        </section>

      </div>

      {/* ROW 1.5: Messaging Settings (Full Width) */}
      {/* Hidden for now until WebSockets are implemented
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
            <MessageSquare className="w-4 h-4 text-zinc-500" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Messaging Configuration</h4>
            <p className="text-sm text-zinc-500">Manage organization-wide chat and notification settings</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
          <RealtimeMessagesEditor initialEnabled={business.realtimeMessagesEnabled} />
        </div>
      </section>

      <hr className="border-zinc-200 dark:border-white/10" />
      */}

      {/* ROW 2: Workflow Presets (Full Width) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
            <Layout className="w-4 h-4 text-zinc-500" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Workflow Presets</h4>
            <p className="text-sm text-zinc-500">Quickly apply an industry-standard layout for your pipeline stages and navigation sidebar</p>
          </div>
        </div>
        <div className="pt-2">
          <WorkflowPresetSelector />
        </div>
      </section>

      <hr className="border-zinc-200 dark:border-white/10" />

      {/* ROW 3: Customization Editors (2x2 Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
        
        {/* Pipeline Stages */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
              <Workflow className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pipeline Stages</h4>
              <p className="text-xs text-zinc-500">Customize the workflow stages in your Kanban board</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
            {template ? (
              <PipelineStagesEditor stages={template.stages} />
            ) : (
              <p className="text-sm text-zinc-500">No pipeline template found. Visit the Pipeline page to auto-create one.</p>
            )}
          </div>
        </section>

        {/* Navigation Preferences */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Navigation Preferences</h4>
              <p className="text-xs text-zinc-500">Customize your sidebar by reordering or hiding items</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
            <NavPreferencesEditor 
              initialPreferences={user?.navPreferences as any} 
            />
          </div>
        </section>

        {/* Quick Actions Preferences */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
              <Zap className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick Actions</h4>
              <p className="text-xs text-zinc-500">Customize your quick action shortcuts (+ New)</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
            <QuickActionsEditor 
              initialPreferences={user?.quickActionPreferences as any} 
            />
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
              <BellRing className="w-4 h-4 text-zinc-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications & Sound</h4>
              <p className="text-xs text-zinc-500">Configure tones and Do Not Disturb</p>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
            <NotificationPreferencesEditor initialPreferences={user?.notificationPreferences as any} />
          </div>
        </section>

      </div>
    </div>
  )
}
