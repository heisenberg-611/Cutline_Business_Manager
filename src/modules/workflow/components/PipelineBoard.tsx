'use client'

import React, { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'

import { updateProjectStage, updateProjectOrder } from '../actions'
import { FeedbackPromptModal } from './FeedbackPromptModal'
import { MemberDeliveryModal } from './MemberDeliveryModal'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { RotateCcw } from 'lucide-react'
import { getIconByName, getDefaultStageIcon } from '@/lib/icons'

type Stage = {
  id: string
  name: string
  orderIndex: number
  icon?: string | null
}

type Project = {
  id: string
  title: string
  priority: string | null
  deadline: Date | null
  statusStageId: string | null
  orderIndex: number
  client?: { displayName: string }
  assignee?: { firstName: string | null; lastName: string | null; imageUrl: string | null; email: string | null } | null
}

type SortMode = 'custom' | 'deadline' | 'priority'

const isDeliveryStage = (stageName: string) => {
  if (!stageName) return false
  const name = stageName.toLowerCase()
  return (
    name.includes('deliver') ||
    name.includes('done') ||
    name.includes('complet') ||
    name.includes('close') ||
    name.includes('finish') ||
    name.includes('final') ||
    name.includes('launch') ||
    name.includes('live') ||
    name.includes('ship') ||
    name.includes('release') ||
    name.includes('handoff') ||
    name.includes('handover') ||
    name.includes('deploy') ||
    name.includes('accept') ||
    name.includes('approv') ||
    name.includes('sign-off') ||
    name.includes('signoff') ||
    name.includes('archive') ||
    name.includes('fulfill') ||
    name.includes('wrap') ||
    name.includes('conclude') ||
    name.includes('resolve') ||
    name.includes('settle')
  )
}

export default function PipelineBoard({ stages, projects: initialProjects, hasFeedbackFeature = true }: { stages: Stage[], projects: Project[], hasFeedbackFeature?: boolean }) {

  const { orgRole } = useAuth()
  const isAdmin = orgRole === 'org:admin'
  const [isPending, startTransition] = useTransition()

  // Need local state for optimistic UI updates with dnd
  const [projects, setProjects] = useState(initialProjects)

  // Feedback & Delivery Modal State
  const [feedbackPromptOpen, setFeedbackPromptOpen] = useState(false)
  const [memberDeliveryModalOpen, setMemberDeliveryModalOpen] = useState(false)
  const [completedProject, setCompletedProject] = useState<Project | null>(null)

  // Sync if props change
  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  // Required for Next.js strict mode hydration with dnd
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const [sortMode, setSortMode] = useState<SortMode>('custom')

  // Group projects by stageId
  const projectsByStage = stages.reduce((acc, stage) => {
    let stageProjects = projects.filter(p => p.statusStageId === stage.id)

    if (sortMode === 'custom') {
      stageProjects.sort((a, b) => a.orderIndex - b.orderIndex)
    } else if (sortMode === 'deadline') {
      stageProjects.sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      })
    } else if (sortMode === 'priority') {
      const pWeight = (p: string | null) => {
        const val = p?.toLowerCase()
        if (val === 'high') return 3
        if (val === 'medium') return 2
        if (val === 'low') return 1
        return 0
      }
      stageProjects.sort((a, b) => pWeight(b.priority) - pWeight(a.priority))
    }

    acc[stage.id] = stageProjects
    return acc
  }, {} as Record<string, Project[]>)

  const unmappedProjects = projects.filter(p => !p.statusStageId || !stages.find(s => s.id === p.statusStageId))
  if (unmappedProjects.length > 0 && stages.length > 0) {
    if (!projectsByStage[stages[0].id]) projectsByStage[stages[0].id] = []
    projectsByStage[stages[0].id].push(...unmappedProjects)
  }

  const handleDragEnd = (result: any) => {
    if (sortMode !== 'custom') return

    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const sourceStageId = source.droppableId
    const destStageId = destination.droppableId

    // Get current sorted lists
    const sourceList = Array.from(projectsByStage[sourceStageId] || [])
    const destList = sourceStageId === destStageId ? sourceList : Array.from(projectsByStage[destStageId] || [])

    const draggedProject = projects.find(p => p.id === draggableId)
    if (!draggedProject) return

    // Remove from source list
    sourceList.splice(source.index, 1)

    // Add to destination list
    destList.splice(destination.index, 0, { ...draggedProject, statusStageId: destStageId })

    // Generate updates
    const updates: { id: string, statusStageId: string, orderIndex: number }[] = []
    destList.forEach((p, i) => {
      updates.push({ id: p.id, statusStageId: destStageId, orderIndex: i })
    })

    // Optimistically update
    setProjects(prev => {
      const newProjects = [...prev]
      updates.forEach(u => {
        const idx = newProjects.findIndex(p => p.id === u.id)
        if (idx !== -1) {
          newProjects[idx] = { ...newProjects[idx], statusStageId: u.statusStageId, orderIndex: u.orderIndex }
        }
      })
      return newProjects
    })

    startTransition(() => {
      updateProjectOrder(updates)
    })

    // Check if moved to terminal delivery stage to trigger feedback prompt
    const destStage = stages.find(s => s.id === destStageId)
    const isTerminal = destStage && destStage.orderIndex === Math.max(...stages.map(s => s.orderIndex))
    const isDelivery = destStage && isDeliveryStage(destStage.name)
    
    // Trigger if it's BOTH the final stage AND it has a delivery keyword
    if (destStage && (isTerminal && isDelivery)) {
      if (draggedProject && draggedProject.client) {
        setCompletedProject(draggedProject)
        if (isAdmin) {
          setFeedbackPromptOpen(true)
        } else {
          setMemberDeliveryModalOpen(true)
        }
      }
    }
  }

  // Middle-click scrolling state
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) { // Middle click
      e.preventDefault()
      setIsDragging(true)
      if (scrollContainerRef.current) {
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft)
        setScrollLeft(scrollContainerRef.current.scrollLeft)
        scrollContainerRef.current.style.cursor = 'grabbing'
      }
    }
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.cursor = ''
      }
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1 && isDragging) {
      setIsDragging(false)
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.cursor = ''
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 2 // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }

  const [boardHeight, setBoardHeight] = useState('65vh')

  const resetSize = () => {
    setBoardHeight('65vh')
    if (wrapperRef.current) {
      wrapperRef.current.style.width = ''
      wrapperRef.current.style.height = '65vh'
    }
  }

  if (!isMounted) return null

  return (
    <div className="flex flex-col gap-4">
      <style dangerouslySetInnerHTML={{
        __html: `
        .pipeline-resizer-wrapper {
          position: relative;
        }
        .pipeline-resizer-wrapper::-webkit-resizer {
          background-color: transparent;
          background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='2' fill='%2371717a'/%3E%3Ccircle cx='12' cy='6' r='2' fill='%2371717a'/%3E%3Ccircle cx='6' cy='12' r='2' fill='%2371717a'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
        }
        .dark .pipeline-resizer-wrapper::-webkit-resizer {
          background-image: url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='2' fill='%23a1a1aa'/%3E%3Ccircle cx='12' cy='6' r='2' fill='%23a1a1aa'/%3E%3Ccircle cx='6' cy='12' r='2' fill='%23a1a1aa'/%3E%3C/svg%3E");
        }
        .pipeline-resizer-wrapper::-webkit-scrollbar {
          display: none;
        }
      `}} />
      <div className="flex items-center justify-end gap-3 px-1 shrink-0">
        <button
          onClick={resetSize}
          className="flex items-center justify-center h-8 px-3 gap-1.5 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm font-normal text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          title="Reset Size to Default"
        >
          <RotateCcw className="w-4 h-4 text-zinc-500" />
          <span>Reset</span>
        </button>

        <Select value={boardHeight} onValueChange={(val) => val && setBoardHeight(val)}>
          <SelectTrigger className="w-[140px] h-9 text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder="Height" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value="50vh" className="text-sm">Height: 50%</SelectItem>
            <SelectItem value="65vh" className="text-sm">Height: 65%</SelectItem>
            <SelectItem value="80vh" className="text-sm">Height: 80%</SelectItem>
            <SelectItem value="100vh" className="text-sm">Height: 100%</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortMode} onValueChange={(val) => setSortMode(val as SortMode)}>
          <SelectTrigger className="w-[180px] h-9 text-sm bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value="custom" className="text-sm">Custom Order</SelectItem>
            <SelectItem value="deadline" className="text-sm">Due Date</SelectItem>
            <SelectItem value="priority" className="text-sm">Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Outer resizable wrapper */}
        <div
          ref={wrapperRef}
          className="pipeline-resizer-wrapper resize overflow-hidden w-[101%] min-h-[400px] pb-4 pr-4 -mr-4 -mb-4"
          style={{ height: boardHeight }}
        >
          {/* Inner styled container */}
          <div
            ref={scrollContainerRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            className="flex gap-5 overflow-x-auto overflow-y-hidden p-6 w-full h-full rounded-2xl bg-white dark:bg-zinc-900/30 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-zinc-600 [&::-webkit-scrollbar-track]:bg-transparent"
          >
            {stages.map(stage => (
              <Droppable key={stage.id} droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex flex-col w-80 shrink-0 rounded-xl border transition-colors ${snapshot.isDraggingOver ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'}`}
                  >
                    <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 rounded-t-xl">
                      <div className="flex items-center gap-2">
                        <div className="text-zinc-500 dark:text-zinc-400">
                          {(() => {
                            const CustomIcon = getIconByName(stage.icon);
                            const FallbackIcon = getDefaultStageIcon(stage.name);
                            const ActiveIcon = CustomIcon || FallbackIcon;

                            // For backward compatibility with the old getStageIcon return structure, 
                            // we ensure color-coding for final/delivery stages by applying the class
                            const isDelivery = isDeliveryStage(stage.name);

                            return <ActiveIcon className={`w-4 h-4 ${!CustomIcon && isDelivery ? 'text-green-500' : 'text-zinc-500 dark:text-zinc-400'}`} />
                          })()}
                        </div>
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{stage.name}</h4>
                      </div>
                      <span className="text-xs font-mono font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
                        {projectsByStage[stage.id]?.length || 0}
                      </span>
                    </div>

                    <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[150px]">
                      {projectsByStage[stage.id]?.map((project, index) => (
                        <Draggable key={project.id} draggableId={project.id} index={index} isDragDisabled={sortMode !== 'custom'}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white dark:bg-zinc-950 p-4 rounded-lg border shadow-sm flex flex-col gap-3 transition-all duration-200 ease-out-smooth border-l-4 ${snapshot.isDragging ? 'border-blue-500 shadow-xl scale-[1.02] rotate-1 z-50' : 'border-zinc-200 dark:border-zinc-800 hover:shadow-md hover:border-zinc-300'} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
                              style={{
                                ...provided.draggableProps.style,
                                ...(project.priority?.toLowerCase() === 'high' ? { borderLeftColor: '#ef4444' } :
                                  project.priority?.toLowerCase() === 'medium' ? { borderLeftColor: '#f97316' } :
                                    project.priority?.toLowerCase() === 'low' ? { borderLeftColor: '#3b82f6' } :
                                      {})
                              }}
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
                                        project.priority?.toLowerCase() === 'high' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20 text-[10px] px-1.5' :
                                          project.priority?.toLowerCase() === 'medium' ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200/50 dark:border-orange-500/20 text-[10px] px-1.5' :
                                            'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20 text-[10px] px-1.5'
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
                                {project.assignee && (
                                  <div className="relative group flex items-center shrink-0">
                                    {project.assignee.imageUrl ? (
                                      <img src={project.assignee.imageUrl} alt="Assignee" className="w-5 h-5 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 cursor-pointer" />
                                    ) : (
                                      <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[9px] font-medium text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 uppercase cursor-pointer">
                                        {(project.assignee.firstName?.[0] || '')}{(project.assignee.lastName?.[0] || '')}
                                      </div>
                                    )}
                                    
                                    {/* Hover Card */}
                                    <div className="absolute bottom-full right-0 mb-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl p-3 pointer-events-none transform translate-y-1 group-hover:translate-y-0">
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
                                            {[project.assignee.firstName, project.assignee.lastName].filter(Boolean).join(' ') || 'Assignee'}
                                          </div>
                                          {project.assignee.email && (
                                            <div className="text-xs text-zinc-500 truncate">
                                              {project.assignee.email}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
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

                                    const destStage = stages.find(s => s.id === val)
                                    const isTerminal = destStage && destStage.orderIndex === Math.max(...stages.map(stage => stage.orderIndex))
                                    const isDelivery = destStage && isDeliveryStage(destStage.name)
                                    
                                    // Trigger if it's BOTH the final stage AND it has a delivery keyword
                                    if (destStage && (isTerminal && isDelivery)) {
                                      if (project.client) {
                                        setCompletedProject(project)
                                        if (isAdmin) {
                                          setFeedbackPromptOpen(true)
                                        } else {
                                          setMemberDeliveryModalOpen(true)
                                        }
                                      }
                                    }
                                  }}
                                  disabled={isPending}
                                >
                                  <SelectTrigger className="h-7 text-xs bg-transparent border-dashed">
                                    <SelectValue>{stage.name}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent align="start" alignItemWithTrigger={false}>
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
        </div>
      </DragDropContext>

      {isMounted && completedProject && completedProject.client && (
        <>
          <FeedbackPromptModal
            open={feedbackPromptOpen}
            onOpenChange={setFeedbackPromptOpen}
            projectId={completedProject.id}
            clientId={(completedProject as any).clientId || completedProject.client?.displayName}
            clientHasEmail={!!(completedProject as any).client?.email}
            projectName={completedProject.title}
            hasFeedbackFeature={hasFeedbackFeature}
          />
          <MemberDeliveryModal
            open={memberDeliveryModalOpen}
            onOpenChange={setMemberDeliveryModalOpen}
            projectId={completedProject.id}
            projectName={completedProject.title}
          />
        </>
      )}
    </div>
  )
}
