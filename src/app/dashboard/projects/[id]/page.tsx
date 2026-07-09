import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getProjectDetails } from '@/modules/projects/detail-actions'
import { NotesPanel } from '@/modules/projects/components/NotesPanel'
import { LinksPanel } from '@/modules/projects/components/LinksPanel'
import { TimePanel } from '@/modules/projects/components/TimePanel'
import { AssetPanel } from '@/modules/projects/components/AssetPanel'
import { ProjectActions } from '@/modules/projects/components/ProjectActions'
import prisma from '@/modules/core/db/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, CalendarDays, Folder } from 'lucide-react'
import { format } from 'date-fns'

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  // Next.js 15: params must be awaited
  const { id } = await params
  
  const [project, availableAssets] = await Promise.all([
    getProjectDetails(id),
    prisma.asset.findMany({
      where: { businessId: orgId },
      orderBy: { name: 'asc' }
    })
  ])

  if (!project) {
    notFound()
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
                {project.title}
              </h3>
              {project.statusStage && (
                <Badge variant="outline" className="bg-zinc-50 text-zinc-600 border-zinc-200">
                  {project.statusStage.name}
                </Badge>
              )}
            </div>
            <div className="text-sm text-zinc-500 flex items-center gap-4">
              <span className="flex items-center gap-1.5"><Folder className="w-3.5 h-3.5" /> {project.client.displayName}</span>
              {project.deadline && (
                <span className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Due {format(new Date(project.deadline), 'MMM d, yyyy')}</span>
              )}
            </div>
          </div>
        </div>
        <ProjectActions project={{
          id: project.id,
          title: project.title,
          priority: project.priority,
          deadline: project.deadline,
          isArchived: project.isArchived
        }} />
      </div>
      
      {/* Main Content Area - Split into Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 min-h-0">
        {/* Notes Column */}
        <div className="min-h-0">
          <NotesPanel projectId={project.id} notes={project.notes} />
        </div>

        {/* Links Column */}
        <div className="min-h-0">
          <LinksPanel projectId={project.id} links={project.links as any} />
        </div>

        {/* Time Tracking Column */}
        <div className="min-h-0">
          <TimePanel projectId={project.id} timeEntries={project.timeEntries} />
        </div>

        {/* Assets Column */}
        <div className="min-h-0">
          <AssetPanel 
            projectId={project.id} 
            currentAssets={project.assets} 
            availableAssets={availableAssets} 
          />
        </div>
      </div>
    </div>
  )
}
