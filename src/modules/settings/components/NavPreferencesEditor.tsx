'use client'

import React, { useState, useTransition } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { GripVertical, Loader2 } from 'lucide-react'
import { ALL_NAV_ITEMS, NAV_SECTIONS, NavPreference, NavSection } from '@/modules/core/ui/navigation'
import { updateNavPreferences } from '../actions'
import { useRouter } from 'next/navigation'

function prefsInSection(section: NavSection, prefs: NavPreference[]) {
  const hrefs = new Set(section.items.map(i => i.href))
  return prefs.filter(p => hrefs.has(p.href))
}

function buildFullPreferenceList(initial?: NavPreference[]): NavPreference[] {
  if (initial && initial.length > 0) {
    const prefMap = new Map(initial.map(p => [p.href, p]))
    const fullList = [...initial]
    ALL_NAV_ITEMS.forEach(item => {
      if (!prefMap.has(item.href)) {
        fullList.push({ href: item.href, visible: true })
      }
    })
    return fullList
  }
  return ALL_NAV_ITEMS.map(item => ({ href: item.href, visible: true }))
}

export function NavPreferencesEditor({ initialPreferences }: { initialPreferences?: NavPreference[] }) {
  const [preferences, setPreferences] = useState<NavPreference[]>(() => buildFullPreferenceList(initialPreferences))

  React.useEffect(() => {
    setPreferences(buildFullPreferenceList(initialPreferences))
  }, [initialPreferences])

  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Drag is constrained to within a section (each Droppable's `type` matches
  // its section id, so the dnd library won't even allow a cross-section drop
  // visually) — reordering rebuilds the full flat list by concatenating every
  // section in NAV_SECTIONS order, which also self-heals any legacy order
  // saved before section grouping existed.
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    if (result.destination.droppableId !== result.source.droppableId) return
    const sectionId = result.source.droppableId
    const section = NAV_SECTIONS.find(s => s.id === sectionId)
    if (!section) return

    const sectionPrefs = prefsInSection(section, preferences)
    const [moved] = sectionPrefs.splice(result.source.index, 1)
    sectionPrefs.splice(result.destination.index, 0, moved)

    setPreferences(
      NAV_SECTIONS.flatMap(s => (s.id === sectionId ? sectionPrefs : prefsInSection(s, preferences)))
    )
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
        <div className="space-y-6">
          {NAV_SECTIONS.map((section) => {
            const sectionPrefs = prefsInSection(section, preferences)
            return (
              <div key={section.id} className="space-y-2">
                {section.label && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    {section.label}
                  </h3>
                )}
                <Droppable droppableId={section.id} type={section.id}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2"
                    >
                      {sectionPrefs.map((pref, index) => {
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
              </div>
            )
          })}
        </div>
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
