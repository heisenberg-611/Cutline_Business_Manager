'use client'

import React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

type Project = {
  id: string
  title: string
  priority: string | null
  deadline: Date | null
  statusStageId: string | null
  client?: { displayName: string }
  type?: string | null
}

type Stage = {
  id: string
  name: string
  orderIndex: number
}

export function PipelineTable({ projects, stages }: { projects: Project[], stages: Stage[] }) {
  const getStageName = (stageId: string | null) => {
    if (!stageId) return 'Unmapped'
    return stages.find(s => s.id === stageId)?.name || 'Unknown'
  }

  // Optional sorting by stage order then deadline
  const sortedProjects = [...projects].sort((a, b) => {
    const stageA = stages.find(s => s.id === a.statusStageId)?.orderIndex ?? 999
    const stageB = stages.find(s => s.id === b.statusStageId)?.orderIndex ?? 999
    
    if (stageA !== stageB) return stageA - stageB
    
    if (!a.deadline) return 1
    if (!b.deadline) return -1
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  })

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden min-h-[600px]">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Project Title</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Deadline</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProjects.map((project) => (
            <TableRow key={project.id}>
              <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                <Link href={`/dashboard/projects/${project.id}`} className="hover:underline">
                  {project.title}
                </Link>
                {project.type && <div className="text-xs text-zinc-500 font-normal mt-0.5">{project.type}</div>}
              </TableCell>
              <TableCell>
                {project.client?.displayName || '-'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50">
                  {getStageName(project.statusStageId)}
                </Badge>
              </TableCell>
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
                {project.deadline ? (
                  <span className={new Date(project.deadline) < new Date() ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                    {format(new Date(project.deadline), 'MMM d, yyyy')}
                  </span>
                ) : '-'}
              </TableCell>
            </TableRow>
          ))}
          {sortedProjects.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center h-24 text-zinc-500">
                No active projects found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
