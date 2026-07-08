import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import prisma from '@/modules/core/db/prisma'
import { PipelineStagesEditor } from '@/modules/settings/components/PipelineStagesEditor'
import { CurrencySelector } from '@/modules/settings/components/CurrencySelector'
import { Building2, Workflow, DollarSign } from 'lucide-react'

export default async function SettingsPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/dashboard/select-business')

  const [business, template] = await Promise.all([
    prisma.business.findUnique({ where: { id: orgId } }),
    prisma.workflowTemplate.findFirst({
      where: { businessId: orgId },
      include: { stages: { orderBy: { orderIndex: 'asc' } } },
    }),
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
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Studio Name</label>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1">{business.name}</p>
            <p className="text-xs text-zinc-400 mt-1">Managed via Clerk Organization settings</p>
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
    </div>
  )
}
