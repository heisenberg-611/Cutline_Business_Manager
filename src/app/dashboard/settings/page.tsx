import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { PipelineStagesEditor } from '@/modules/settings/components/PipelineStagesEditor'
import { CurrencySelector } from '@/modules/settings/components/CurrencySelector'
import { Building2, Workflow, DollarSign, Mail } from 'lucide-react'
import Link from 'next/link'
import { BusinessNameEditor } from '@/modules/settings/components/BusinessNameEditor'
import { NavPreferencesEditor } from '@/modules/settings/components/NavPreferencesEditor'
import { WorkflowPresetSelector } from '@/modules/settings/components/WorkflowPresetSelector'

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
    <div className="space-y-10 max-w-3xl">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-white/10 pb-5">
        <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
          Settings
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          Manage your studio configuration, pipeline stages, and preferences.
        </p>
      </div>

      {/* Workflow Presets */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Workflow Presets</h4>
            <p className="text-xs text-zinc-500">Quickly apply an industry-standard layout for your pipeline and navigation</p>
          </div>
        </div>
        <WorkflowPresetSelector />
      </section>

      {/* Business Info */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
            <Building2 className="w-4 h-4 text-zinc-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Business Profile</h4>
            <p className="text-xs text-zinc-500">Your studio identity and branding</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Business Name</label>
            <BusinessNameEditor currentName={business.name} />
            <p className="text-xs text-zinc-400 mt-2">This is your official Clerk Organization name. Updating it will automatically sync across the platform.</p>
          </div>
        </div>
      </section>

      {/* Currency */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
            <DollarSign className="w-4 h-4 text-zinc-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Default Currency</h4>
            <p className="text-xs text-zinc-500">Used for new invoices and financial reports</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6">
          <CurrencySelector currentCurrency={business.defaultCurrency} />
        </div>
      </section>

      {/* Invoice & Email Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900">
            <Mail className="w-4 h-4 text-zinc-500" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Invoice & Email Customization</h4>
            <p className="text-xs text-zinc-500">Customize invoice numbers and client email templates</p>
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl p-6 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Manage Email Templates</p>
            <p className="text-xs text-zinc-500 mt-1">Setup dynamic placeholders and numbering prefixes.</p>
          </div>
          <Link href="/dashboard/settings/invoice" className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-50 shadow transition-colors hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90">
            Configure
          </Link>
        </div>
      </section>

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
    </div>
  )
}
