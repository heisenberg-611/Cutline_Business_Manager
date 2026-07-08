import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ensureDefaultTemplate } from '@/modules/workflow/actions'
import { getProjects } from '@/modules/projects/actions'
import PipelineBoard from '@/modules/workflow/components/PipelineBoard'
import { PipelineTable } from '@/modules/workflow/components/PipelineTable'
import { PipelineTimeline } from '@/modules/workflow/components/PipelineTimeline'
import { PipelineViewToggle } from '@/modules/workflow/components/PipelineViewToggle'

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { orgId } = await auth()
  const resolvedSearchParams = await searchParams
  const view = resolvedSearchParams?.view || 'board'
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  // 1. Ensure template exists and get it
  const template = await ensureDefaultTemplate(orgId)

  // 2. Fetch all projects
  // We use the same server action from the projects module!
  const projects = await getProjects(orgId)

  if (!template) {
    return <div>Error loading pipeline.</div>
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Pipeline
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Drag and drop your projects through the editing stages.
          </p>
        </div>
        <PipelineViewToggle />
      </div>
      
      {/* View Container */}
      <div className="flex-1 min-h-[600px] overflow-hidden -mx-6 md:-mx-10 px-6 md:px-10 pb-6">
        {view === 'timeline' ? (
          <PipelineTimeline stages={template.stages} projects={projects as any[]} />
        ) : view === 'table' ? (
          <PipelineTable stages={template.stages} projects={projects as any[]} />
        ) : (
          <PipelineBoard stages={template.stages} projects={projects as any[]} />
        )}
      </div>
    </div>
  )
}
