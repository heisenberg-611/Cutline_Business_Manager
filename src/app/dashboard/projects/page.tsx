import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProjects, getOrgUsers } from '@/modules/projects/actions'
import { getClients } from '@/modules/clients/actions'
import { getPendingProjectRequests } from '@/modules/prodp/actions'
import { ProjectRequestsPanel } from '@/modules/prodp/components/ProjectRequestsPanel'
import { ProjectForm } from '@/modules/projects/components/ProjectForm'
import { ExportProjectsButton } from '@/modules/projects/components/ExportProjectsButton'
import { StageProgressPipeline } from '@/modules/projects/components/StageProgressPipeline'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from 'date-fns'

export const metadata = {
  title: 'Projects',
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { orgId, orgRole } = await auth()
  const isAdmin = orgRole === 'org:admin'
  const resolvedSearchParams = await searchParams
  const shouldOpenNewProject = resolvedSearchParams.newProject === '1'
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const projectsPromise = getProjects(orgId)
  const clientsPromise = isAdmin ? getClients(orgId) : Promise.resolve([])
  const pendingRequestsPromise = isAdmin ? getPendingProjectRequests() : Promise.resolve([])
  const membersPromise = isAdmin ? getOrgUsers(orgId) : Promise.resolve([])

  const [projects, clients, pendingRequests, members] = await Promise.all([
    projectsPromise,
    clientsPromise,
    pendingRequestsPromise,
    membersPromise
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Projects
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your active editing projects, track deadlines, and priorities.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          {isAdmin && (
            <>
              <ExportProjectsButton projects={projects} />
              <ProjectForm
                clients={clients.map(c => ({ id: c.id, displayName: c.displayName }))}
                members={members}
                defaultOpen={shouldOpenNewProject}
              />
            </>
          )}
        </div>
      </div>
      
      {isAdmin && <ProjectRequestsPanel requests={pendingRequests as any} />}
      
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {projects.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm flex flex-col items-center">
            {isAdmin ? (
              clients.length === 0 ? (
                <>
                  <p>You need to create a Client before you can create a project.</p>
                  <p className="mt-2 text-xs">Go to the Clients tab to get started.</p>
                </>
              ) : (
                <p>You don't have any projects yet. Click "New Project" to get started!</p>
              )
            ) : (
              <p>You don't have any projects assigned to you yet.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Project Title</TableHead>
                <TableHead>Client</TableHead>
                {isAdmin && <TableHead>Assignee</TableHead>}
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="w-[300px]">Pipeline Progress</TableHead>
                <TableHead>Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                    <Link href={`/dashboard/projects/${project.id}`} className="hover:underline flex flex-col">
                      <span>{project.title}</span>
                      {project.displayId && (
                        <span className="text-xs text-zinc-500 font-normal">{project.displayId}</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {/* @ts-ignore - TS doesn't know client is included despite prisma query include */}
                    {project.client?.displayName || '-'}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {/* @ts-ignore */}
                      {project.assignee ? (
                        <div className="relative group flex items-center gap-2 w-max cursor-pointer">
                          {project.assignee.imageUrl ? (
                            <img src={project.assignee.imageUrl} alt="Assignee" className="w-6 h-6 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase">
                              {(project.assignee.firstName?.[0] || '')}{(project.assignee.lastName?.[0] || '')}
                            </div>
                          )}
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {[project.assignee.firstName, project.assignee.lastName].filter(Boolean).join(' ') || project.assignee.email.split('@')[0]}
                          </span>
                          
                          {/* Hover Card */}
                          <div className="absolute bottom-full left-0 mb-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-3 pointer-events-none transform translate-y-1 group-hover:translate-y-0">
                            <div className="flex items-center gap-3">
                              {project.assignee.imageUrl ? (
                                <img src={project.assignee.imageUrl} alt="Assignee" className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase">
                                  {(project.assignee.firstName?.[0] || '')}{(project.assignee.lastName?.[0] || '')}
                                </div>
                              )}
                              <div className="overflow-hidden">
                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                  {[project.assignee.firstName, project.assignee.lastName].filter(Boolean).join(' ') || project.assignee.email.split('@')[0]}
                                </div>
                                {project.assignee.email && (
                                  <div className="text-xs text-zinc-500 truncate mt-0.5">
                                    {project.assignee.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-zinc-400">Unassigned</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>{project.type || '-'}</TableCell>
                  <TableCell>
                    {project.priority ? (
                      <Badge 
                        variant="secondary" 
                        className={
                          project.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20' :
                          project.priority?.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200/50 dark:border-orange-500/20' :
                          'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20'
                        }
                      >
                        {project.priority}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="min-w-[250px]">
                    <StageProgressPipeline project={project as any} />
                  </TableCell>
                  <TableCell>
                    {project.deadline ? format(new Date(project.deadline), 'MMM d, yyyy') : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
