'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PIPELINE_ICONS, getIconByName, PipelineIconName, getDefaultStageIcon } from '@/lib/icons'
import { 
  addWorkflowStage, 
  updateWorkflowStage, 
  deleteWorkflowStage,
  reorderWorkflowStages
} from '@/modules/settings/actions'
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react'

type Stage = {
  id: string
  name: string
  orderIndex: number
  icon?: string | null
}

const IconSelector = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => {
  return (
    <Select value={value} onValueChange={(val) => { if (val) onChange(val) }}>
      <SelectTrigger className="w-full sm:w-[140px] h-8 text-xs shrink-0">
        <SelectValue placeholder="Select icon..." />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        {Object.keys(PIPELINE_ICONS).map((iconName) => {
          const IconComp = PIPELINE_ICONS[iconName as PipelineIconName]
          return (
            <SelectItem key={iconName} value={iconName}>
              <div className="flex items-center gap-2">
                <IconComp className="w-4 h-4 text-zinc-500" />
                <span className="text-xs">{iconName}</span>
              </div>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

export function PipelineStagesEditor({ stages }: { stages: Stage[] }) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('')
  const [newStageName, setNewStageName] = useState('')
  const [newStageIcon, setNewStageIcon] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [localStages, setLocalStages] = useState(stages)
  
  useEffect(() => {
    setLocalStages(stages)
  }, [stages])

  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleDragEnd = (result: any) => {
    if (!result.destination) return
    const startIndex = result.source.index
    const endIndex = result.destination.index
    if (startIndex === endIndex) return

    const newStages = Array.from(localStages)
    const [removed] = newStages.splice(startIndex, 1)
    newStages.splice(endIndex, 0, removed)
    
    setLocalStages(newStages)

    startTransition(async () => {
      await reorderWorkflowStages(newStages.map(s => s.id))
    })
  }

  const handleUpdate = (stageId: string) => {
    if (!editName.trim()) return
    startTransition(async () => {
      await updateWorkflowStage(stageId, { name: editName.trim(), icon: editIcon || null })
      setEditingId(null)
    })
  }

  const handleDelete = (stageId: string) => {
    if (!confirm('Delete this stage? Projects on it will be moved to the first stage.')) return
    startTransition(async () => {
      await deleteWorkflowStage(stageId)
    })
  }

  const handleAdd = () => {
    if (!newStageName.trim()) return
    startTransition(async () => {
      await addWorkflowStage(newStageName.trim(), newStageIcon || null)
      setNewStageName('')
      setNewStageIcon('')
      setIsAdding(false)
    })
  }

  if (!isMounted) return <div className="h-40 animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-lg"></div>

  return (
    <div className="space-y-3">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="pipeline-stages">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-3"
            >
              {localStages.map((stage, index) => {
                const DisplayIcon = getIconByName(stage.icon) || getDefaultStageIcon(stage.name)
                return (
                  <Draggable key={stage.id} draggableId={stage.id} index={index} isDragDisabled={isPending}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 group ${isPending ? 'opacity-50 pointer-events-none' : ''} ${snapshot.isDragging ? 'shadow-lg border-zinc-300 dark:border-white/20' : ''}`}
                      >
                        <div {...provided.dragHandleProps} className="shrink-0">
                          <GripVertical className="w-4 h-4 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 cursor-grab active:cursor-grabbing" />
                        </div>

                        {editingId === stage.id ? (
                          <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <IconSelector value={editIcon} onChange={setEditIcon} />
                            <div className="flex gap-2 flex-1">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(stage.id)}
                                className="h-8 text-sm flex-1"
                                autoFocus
                              />
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 shrink-0" onClick={() => handleUpdate(stage.id)}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingId(null)}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <DisplayIcon className="w-4 h-4 text-zinc-500" />
                            <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {stage.name}
                            </span>
                            <span className="text-xs text-zinc-400 font-mono mr-2">#{index + 1}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => { 
                                setEditingId(stage.id); 
                                setEditName(stage.name);
                                setEditIcon(stage.icon || '');
                              }}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDelete(stage.id)}
                              disabled={localStages.length <= 1}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {isAdding ? (
        <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg border border-dashed border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-zinc-900">
          <IconSelector value={newStageIcon} onChange={setNewStageIcon} />
          <Input
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Stage name..."
            className="h-8 text-sm flex-1"
            autoFocus
          />
          <div className="flex gap-2 sm:mt-0 mt-1 justify-end">
            <Button size="sm" onClick={handleAdd} disabled={!newStageName.trim() || isPending} className="flex-1 sm:flex-none">
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewStageName(''); setNewStageIcon('') }} className="flex-1 sm:flex-none">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-2" />
          Add Stage
        </Button>
      )}
    </div>
  )
}
