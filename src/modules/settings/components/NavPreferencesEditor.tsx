'use client'

import React, { useState, useTransition } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { GripVertical, Loader2 } from 'lucide-react'
import { ALL_NAV_ITEMS, NavPreference } from '@/modules/core/ui/navigation'
import { updateNavPreferences } from '../actions'
import { useRouter } from 'next/navigation'

export function NavPreferencesEditor({ initialPreferences }: { initialPreferences?: NavPreference[] }) {
  const [preferences, setPreferences] = useState<NavPreference[]>(() => {
    if (initialPreferences && initialPreferences.length > 0) {
      // Ensure all items are present in case new ones were added
      const prefMap = new Map(initialPreferences.map(p => [p.href, p]))
      const fullList = [...initialPreferences]
      ALL_NAV_ITEMS.forEach(item => {
        if (!prefMap.has(item.href)) {
          fullList.push({ href: item.href, visible: true })
        }
      })
      return fullList
    }
    return ALL_NAV_ITEMS.map(item => ({ href: item.href, visible: true }))
  })

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const items = Array.from(preferences)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)
    setPreferences(items)
  }

  const toggleVisibility = (href: string) => {
    setPreferences(prev => prev.map(p => 
      p.href === href ? { ...p, visible: !p.visible } : p
    ))
  }

  const handleSave = () => {
    startTransition(async () => {
      await updateNavPreferences(preferences)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="nav-items">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-2"
            >
              {preferences.map((pref, index) => {
                const navItem = ALL_NAV_ITEMS.find(n => n.href === pref.href)
                if (!navItem) return null
                const Icon = navItem.icon

                return (
                  <Draggable key={pref.href} draggableId={pref.href} index={index}>
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
                          <Icon className="w-4 h-4 text-zinc-500" />
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {navItem.label}
                          </span>
                        </div>
                        <Switch 
                          checked={pref.visible}
                          onCheckedChange={() => toggleVisibility(pref.href)}
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
          Save Preferences
        </Button>
      </div>
    </div>
  )
}
