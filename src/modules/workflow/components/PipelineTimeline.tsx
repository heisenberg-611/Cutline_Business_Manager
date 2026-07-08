'use client'

import React from 'react'
import Link from 'next/link'
import { format, isBefore, startOfToday, isThisWeek, isSameWeek, addWeeks } from 'date-fns'
import { Badge } from "@/components/ui/badge"
import { CalendarClock, AlertCircle } from 'lucide-react'

type Project = {
  id: string
  title: string
  priority: string | null
  deadline: Date | null
  statusStageId: string | null
  client?: { displayName: string }
}

type Stage = {
  id: string
  name: string
  orderIndex: number
}

type TimeGroup = {
  id: string
  title: string
  color: string
  projects: Project[]
}

export function PipelineTimeline({ projects, stages }: { projects: Project[], stages: Stage[] }) {
  const getStageName = (stageId: string | null) => {
    if (!stageId) return 'Unmapped'
    return stages.find(s => s.id === stageId)?.name || 'Unknown'
  }

  const today = startOfToday()
  const nextWeekDate = addWeeks(today, 1)

  // Grouping logic
  const overdue: Project[] = []
  const thisWeek: Project[] = []
  const nextWeek: Project[] = []
  const later: Project[] = []
  const noDeadline: Project[] = []

  projects.forEach(project => {
    if (!project.deadline) {
      noDeadline.push(project)
    } else {
      const date = new Date(project.deadline)
      if (isBefore(date, today)) {
        overdue.push(project)
      } else if (isThisWeek(date, { weekStartsOn: 1 })) {
        thisWeek.push(project)
      } else if (isSameWeek(date, nextWeekDate, { weekStartsOn: 1 })) {
        nextWeek.push(project)
      } else {
        later.push(project)
      }
    }
  })

  // Sort each group by deadline
  const sortByDate = (a: Project, b: Project) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
  overdue.sort(sortByDate)
  thisWeek.sort(sortByDate)
  nextWeek.sort(sortByDate)
  later.sort(sortByDate)

  const groups: TimeGroup[] = [
    { id: 'overdue', title: 'Overdue', color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20', projects: overdue },
    { id: 'this-week', title: 'This Week', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20', projects: thisWeek },
    { id: 'next-week', title: 'Next Week', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20', projects: nextWeek },
    { id: 'later', title: 'Later', color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700', projects: later },
    { id: 'no-deadline', title: 'No Deadline', color: 'text-zinc-500 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800', projects: noDeadline }
  ]

  return (
    <div className="space-y-8 pb-8 min-h-[600px]">
      {groups.filter(g => g.projects.length > 0).map(group => (
        <div key={group.id} className="space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            <h4 className={`text-sm font-semibold px-2.5 py-1 rounded-md border ${group.color}`}>
              {group.title}
            </h4>
            <span className="text-xs text-zinc-500 font-mono">{group.projects.length} items</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {group.projects.map(project => (
              <div 
                key={project.id} 
                className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="text-xs text-zinc-500 mb-1">{project.client?.displayName || 'Unknown Client'}</div>
                  <Link href={`/dashboard/projects/${project.id}`} className="hover:underline">
                    <h5 className="font-medium text-zinc-900 dark:text-zinc-100">{project.title}</h5>
                  </Link>
                </div>
                
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="outline" className="font-mono text-[10px] bg-zinc-50 dark:bg-zinc-900">
                    {getStageName(project.statusStageId)}
                  </Badge>
                  {project.priority && (
                    <Badge 
                      variant="secondary" 
                      className={
                        project.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20 text-[10px] px-1.5' :
                        project.priority?.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200/50 dark:border-orange-500/20 text-[10px] px-1.5' :
                        'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 text-[10px] px-1.5'
                      }
                    >
                      {project.priority}
                    </Badge>
                  )}
                </div>

                {project.deadline && (
                  <div className="pt-3 mt-auto border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                    {group.id === 'overdue' ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : <CalendarClock className="w-3.5 h-3.5" />}
                    <span className={group.id === 'overdue' ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                      {format(new Date(project.deadline), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {projects.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          No projects found in the pipeline.
        </div>
      )}
    </div>
  )
}
