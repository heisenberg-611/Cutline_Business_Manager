import { auth } from '@clerk/nextjs/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getArchivedProjects } from '@/modules/projects/actions'
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
  title: 'Archive',
}

export default async function ArchivePage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const projects = await getArchivedProjects(orgId)

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Archive
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            View your delivered and archived projects here.
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {projects.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm flex flex-col items-center">
            <p>You don't have any archived projects yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Project Title</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Archived Date</TableHead>
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
                          project.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20' :
                          project.priority?.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200/50 dark:border-orange-500/20' :
                          'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20'
                        }
                      >
                        {project.priority}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {project.updatedAt ? format(new Date(project.updatedAt), 'MMM d, yyyy') : '-'}
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
