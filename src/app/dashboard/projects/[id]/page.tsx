import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getProjectDetails } from '@/modules/projects/detail-actions'
import { getOrgUsers } from '@/modules/projects/actions'
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
  
  const [project, availableAssets, members] = await Promise.all([
    getProjectDetails(id),
    prisma.asset.findMany({
      where: { businessId: orgId },
      orderBy: { name: 'asc' }
    }),
    getOrgUsers(orgId)
  ])

  if (!project) {
    notFound()
  }

  return (
    <div className="space-y-6 flex flex-col md:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold leading-6 text-zinc-900 dark:text-zinc-100">
              {project.title}
            </h3>
            {project.displayId && (
              <Badge variant="outline" className="text-xs bg-zinc-50 dark:bg-zinc-900">
                {project.displayId}
              </Badge>
            )}
            {project.isArchived && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 hover:bg-amber-100">
                Archived
              </Badge>
            )}
          </div>
          <div className="mt-2 text-sm text-zinc-500 flex items-center gap-2 flex-wrap">
            Client: <span className="font-medium text-zinc-700 dark:text-zinc-300">{project.client?.displayName}</span>
            {project.priority && (
              <>
                <span>•</span>
                Priority: <span className="font-medium text-zinc-700 dark:text-zinc-300">{project.priority}</span>
              </>
            )}
            {project.assigneeId && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1.5 ml-1">
                  Assignee:
                  {(() => {
                    const assignee = members.find(m => m.user.id === project.assigneeId)?.user;
                    if (!assignee) return <span className="font-medium text-zinc-700 dark:text-zinc-300">Assigned</span>;
                    return (
                      <div className="relative group flex items-center shrink-0 cursor-pointer">
                        {assignee.imageUrl ? (
                          <img src={assignee.imageUrl} alt="Assignee" className="w-5 h-5 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase">
                            {(assignee.firstName?.[0] || '')}{(assignee.lastName?.[0] || '')}
                          </div>
                        )}
                        <span className="ml-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                          {[assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || assignee.email.split('@')[0] || 'Unknown User'}
                        </span>
                        
                        {/* Hover Card */}
                        <div className="absolute top-full left-0 mt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-4 pointer-events-none transform -translate-y-1 group-hover:translate-y-0">
                          <div className="flex items-center gap-4">
                            {assignee.imageUrl ? (
                              <img src={assignee.imageUrl} alt="Assignee" className="w-12 h-12 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase">
                                {(assignee.firstName?.[0] || '')}{(assignee.lastName?.[0] || '')}
                              </div>
                            )}
                            <div className="overflow-hidden">
                              <div className="text-base font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {[assignee.firstName, assignee.lastName].filter(Boolean).join(' ') || assignee.email.split('@')[0] || 'Unknown User'}
                              </div>
                              {assignee.email && (
                                <div className="text-sm text-zinc-500 truncate mt-0.5">
                                  {assignee.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </span>
              </>
            )}
          </div>
        </div>
        <ProjectActions project={{
          id: project.id,
          title: project.title,
          priority: project.priority,
          deadline: project.deadline,
          isArchived: project.isArchived,
          assigneeId: project.assigneeId,
          clientId: project.clientId,
          clientHasEmail: !!project.client?.email
        }} members={members} />
      </div>
      
      {/* Main Content Area - Split into Panels */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 md:min-h-0">
        {/* Notes Column */}
        <div className="h-[400px] md:h-auto md:min-h-0">
          <NotesPanel projectId={project.id} notes={project.notes} />
        </div>

        {/* Links Column */}
        <div className="h-[400px] md:h-auto md:min-h-0">
          <LinksPanel projectId={project.id} links={project.links as any} />
        </div>

        {/* Time Tracking Column */}
        <div className="h-[400px] md:h-auto md:min-h-0">
          <TimePanel projectId={project.id} timeEntries={project.timeEntries} />
        </div>

        {/* Assets Column */}
        <div className="h-[400px] md:h-auto md:min-h-0">
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
