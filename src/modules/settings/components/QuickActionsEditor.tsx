'use client'

import React, { useState, useTransition } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { GripVertical, Loader2 } from 'lucide-react'
import { ALL_QUICK_ACTIONS, QuickActionPreference } from '@/modules/core/ui/quick-actions'
import { updateQuickActionPreferences } from '../actions'
import { useRouter } from 'next/navigation'

export function QuickActionsEditor({ initialPreferences }: { initialPreferences?: QuickActionPreference[] }) {
  const [preferences, setPreferences] = useState<QuickActionPreference[]>(() => {
    if (initialPreferences && initialPreferences.length > 0) {
      const prefMap = new Map(initialPreferences.map(p => [p.id, p]))
      const fullList = [...initialPreferences]
      ALL_QUICK_ACTIONS.forEach(item => {
        if (!prefMap.has(item.id)) {
          // Default to visible if it's the first time seeing this action
          fullList.push({ id: item.id, visible: true })
        }
      })
      return fullList
    }
    return ALL_QUICK_ACTIONS.map(item => ({ id: item.id, visible: true }))
  })

  React.useEffect(() => {
    if (initialPreferences && initialPreferences.length > 0) {
      const prefMap = new Map(initialPreferences.map(p => [p.id, p]))
      const fullList = [...initialPreferences]
      ALL_QUICK_ACTIONS.forEach(item => {
        if (!prefMap.has(item.id)) {
          fullList.push({ id: item.id, visible: true })
        }
      })
      setPreferences(fullList)
    } else {
      setPreferences(ALL_QUICK_ACTIONS.map(item => ({ id: item.id, visible: true })))
    }
  }, [initialPreferences])

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const items = Array.from(preferences)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    setPreferences(items)
  }

  const toggleVisibility = (id: string) => {
    setPreferences(prev => prev.map(p => 
      p.id === id ? { ...p, visible: !p.visible } : p
    ))
  }

  const handleSave = () => {
    startTransition(async () => {
      await updateQuickActionPreferences(preferences)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="quick-actions">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-2"
            >
              {preferences.map((pref, index) => {
                const actionItem = ALL_QUICK_ACTIONS.find(a => a.id === pref.id)
                if (!actionItem) return null

                return (
                  <Draggable key={pref.id} draggableId={pref.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-lg group"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            {...provided.dragHandleProps}
                            className="cursor-grab hover:text-zinc-900 dark:hover:text-white text-zinc-400"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {actionItem.label}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {actionItem.description}
                            </span>
                          </div>
                        </div>
                        <Switch 
                          checked={pref.visible}
                          onCheckedChange={() => toggleVisibility(pref.id)}
                        />
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
      
      <div className="flex justify-end mt-4">
        <Button onClick={handleSave} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Quick Actions
        </Button>
      </div>
    </div>
  )
}
