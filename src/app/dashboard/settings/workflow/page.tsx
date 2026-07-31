import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { SettingsSection } from '@/modules/settings/components/ui'
import { WorkflowPresetSelector } from '@/modules/settings/components/WorkflowPresetSelector'
import { PipelineStagesEditor } from '@/modules/settings/components/PipelineStagesEditor'
import { ensureDefaultTemplate } from '@/modules/workflow/actions'

export const metadata = {
  title: 'Pipeline & Workflow Settings',
}

export default async function WorkflowSettingsPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/dashboard/select-business')

  const template = await ensureDefaultTemplate(orgId)

  return (
    <div className="space-y-10">
      <SettingsSection title="Workflow Presets" description="Apply an industry-standard layout for your pipeline stages and navigation sidebar in one click">
        <div className="p-6">
          <WorkflowPresetSelector />
        </div>
      </SettingsSection>

      <SettingsSection title="Pipeline Stages" description="Customize the workflow stages shown on your Kanban board">
        <div className="p-6">
          {template ? (
            <PipelineStagesEditor stages={template.stages} />
          ) : (
            <p className="text-sm text-zinc-500">No pipeline template found. Visit the Pipeline page to auto-create one.</p>
          )}
        </div>
      </SettingsSection>
    </div>
  )
}
