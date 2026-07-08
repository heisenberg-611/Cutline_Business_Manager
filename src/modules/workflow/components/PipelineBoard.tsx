'use client'

import React, { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { updateProjectStage } from '../actions'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

type Stage = {
  id: string
  name: string
  orderIndex: number
}

type Project = {
  id: string
  title: string
  priority: string | null
  deadline: Date | null
  statusStageId: string | null
  client?: { displayName: string }
}

export default function PipelineBoard({ stages, projects: initialProjects }: { stages: Stage[], projects: Project[] }) {
  const [isPending, startTransition] = useTransition()
  
  // Need local state for optimistic UI updates with dnd
  const [projects, setProjects] = useState(initialProjects)
  
  // Sync if props change
  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  // Required for Next.js strict mode hydration with dnd
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Group projects by stageId
  const projectsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = projects.filter(p => p.statusStageId === stage.id)
    return acc
  }, {} as Record<string, Project[]>)

  const unmappedProjects = projects.filter(p => !p.statusStageId || !stages.find(s => s.id === p.statusStageId))
  if (unmappedProjects.length > 0 && stages.length > 0) {
    if (!projectsByStage[stages[0].id]) projectsByStage[stages[0].id] = []
    projectsByStage[stages[0].id].push(...unmappedProjects)
  }

  const handleDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStageId = destination.droppableId
    
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === draggableId ? { ...p, statusStageId: newStageId } : p))

    startTransition(() => {
      updateProjectStage(draggableId, newStageId)
    })
  }

  if (!isMounted) return null

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-4 pt-2">
        {stages.map(stage => (
          <Droppable key={stage.id} droppableId={stage.id}>
            {(provided, snapshot) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`flex flex-col w-80 shrink-0 rounded-xl border transition-colors ${snapshot.isDraggingOver ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}
              >
                <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 rounded-t-xl">
                  <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{stage.name}</h4>
                  <span className="text-xs font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                    {projectsByStage[stage.id]?.length || 0}
                  </span>
                </div>
                
                <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[150px]">
                  {projectsByStage[stage.id]?.map((project, index) => (
                    <Draggable key={project.id} draggableId={project.id} index={index}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-white dark:bg-zinc-950 p-4 rounded-lg border shadow-sm flex flex-col gap-3 ${snapshot.isDragging ? 'border-blue-500 shadow-md rotate-2' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
                          style={{...provided.draggableProps.style}}
                        >
                          <div>
                            <div className="text-xs text-zinc-500 mb-1 font-medium">{project.client?.displayName || 'Unknown Client'}</div>
                            <Link href={`/dashboard/projects/${project.id}`} className="hover:underline">
                              <h5 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{project.title}</h5>
                            </Link>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex gap-2">
                              {project.priority && (
                                <Badge 
                                  variant="secondary" 
                                  className={
                                    project.priority === 'High' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-[10px] px-1.5' :
                                    project.priority === 'Medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5' :
                                    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5'
                                  }
                                >
                                  {project.priority}
                                </Badge>
                              )}
                              {project.deadline && (
                                <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {format(new Date(project.deadline), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <Select 
                              value={stage.id} 
                              onValueChange={(val) => {
                                if (!val) return
                                setProjects(prev => prev.map(p => p.id === project.id ? { ...p, statusStageId: val } : p))
                                startTransition(() => {
                                  updateProjectStage(project.id, val)
                                })
                              }}
                              disabled={isPending}
                            >
                              <SelectTrigger className="h-7 text-xs bg-transparent border-dashed">
                                <SelectValue>{stage.name}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {stages.map(s => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  )
}
