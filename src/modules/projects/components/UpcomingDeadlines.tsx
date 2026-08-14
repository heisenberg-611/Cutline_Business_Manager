import React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'

interface Project {
  id: string
  title: string
  deadline: Date | null
  client: { displayName: string }
  statusStage: {
    id: string
    name: string
    estimatedHours: number | null
    template: {
      stages: { id: string }[]
    }
  } | null
  stageHistory: { enteredAt: Date }[]
}

export function UpcomingDeadlines({ projects }: { projects: Project[] }) {
  const now = new Date()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(now.getDate() + 3)

  if (projects.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 text-sm">
        No upcoming deadlines.
      </div>
    )
  }

  return (
    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {projects.map(project => {
        let status = 'on-track'
        let hoursInStage = 0
        
        // 1. Check if this is the final stage (safely)
        const stages = project.statusStage?.template?.stages
        const stageName = project.statusStage?.name?.toLowerCase() || ''
        const isFinalByName = 
          stageName.includes('deliver') ||
          stageName.includes('done') ||
          stageName.includes('complet') ||
          stageName.includes('close') ||
          stageName.includes('finish') ||
          stageName.includes('final')
          
        const isFinal = isFinalByName || (stages 
          ? stages.findIndex(s => s.id === project.statusStage!.id) === stages.length - 1
          : false)

        // 2. Determine status
        if (isFinal) {
          status = 'completed'
        } else if (project.deadline && project.deadline < startOfToday) {
          status = 'overdue'
        } else {
          // Check hours in stage first for 'at-risk'
          if (project.statusStage?.estimatedHours && project.stageHistory[0]) {
            hoursInStage = (now.getTime() - new Date(project.stageHistory[0].enteredAt).getTime()) / (1000 * 60 * 60)
            if (hoursInStage > project.statusStage.estimatedHours) {
              status = 'at-risk'
            }
          }
          
          // If it's not 'at-risk' from stage limit, check if deadline is soon
          if (status === 'on-track' && project.deadline && project.deadline <= threeDaysFromNow) {
            status = 'watch'
          }
        }

        return (
          <li key={project.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <Link href={`/dashboard/projects/${project.id}`} className="flex justify-between items-center w-full">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{project.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-zinc-500">{project.client.displayName}</p>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {project.deadline!.toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* 3. Render the appropriate badge */}
              <div className="text-right ml-4 shrink-0">
                {status === 'completed' ? (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/70 border-emerald-200 dark:border-emerald-800">
                    Completed
                  </Badge>
                ) : status === 'overdue' ? (
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/70 border-red-200 dark:border-red-800">
                    Overdue
                  </Badge>
                ) : status === 'at-risk' ? (
                  <Badge variant="destructive">At Risk</Badge>
                ) : status === 'watch' ? (
                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-400 dark:hover:bg-amber-900/70 border-amber-200 dark:border-amber-800">
                    Watch
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    On Track
                  </Badge>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}