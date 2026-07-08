import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProjects } from '@/modules/projects/actions'
import { getClients } from '@/modules/clients/actions'
import { ProjectForm } from '@/modules/projects/components/ProjectForm'
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

export default async function ProjectsPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const [projects, clients] = await Promise.all([
    getProjects(orgId),
    getClients(orgId)
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
        <ProjectForm clients={clients.map(c => ({ id: c.id, displayName: c.displayName }))} />
      </div>
      
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {projects.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm flex flex-col items-center">
            {clients.length === 0 ? (
              <>
                <p>You need to create a Client before you can create a project.</p>
                <p className="mt-2 text-xs">Go to the Clients tab to get started.</p>
              </>
            ) : (
              <p>You don't have any projects yet. Click "New Project" to get started!</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Project Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                    <Link href={`/dashboard/projects/${project.id}`} className="hover:underline">
                      {project.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {/* @ts-ignore - TS doesn't know client is included despite prisma query include */}
                    {project.client?.displayName || '-'}
                  </TableCell>
                  <TableCell>{project.type || '-'}</TableCell>
                  <TableCell>
                    {project.priority ? (
                      <Badge 
                        variant="secondary" 
                        className={
                          project.priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          project.priority === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }
                      >
                        {project.priority}
                      </Badge>
                    ) : '-'}
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
