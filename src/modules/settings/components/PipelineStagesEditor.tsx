'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  addWorkflowStage, 
  renameWorkflowStage, 
  deleteWorkflowStage 
} from '@/modules/settings/actions'
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react'

type Stage = {
  id: string
  name: string
  orderIndex: number
}

export function PipelineStagesEditor({ stages }: { stages: Stage[] }) {
  const [isPending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newStageName, setNewStageName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleRename = (stageId: string) => {
    if (!editName.trim()) return
    startTransition(async () => {
      await renameWorkflowStage(stageId, editName.trim())
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
      await addWorkflowStage(newStageName.trim())
      setNewStageName('')
      setIsAdding(false)
    })
  }

  return (
    <div className="space-y-3">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className={`flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 group ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <GripVertical className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0" />

          {editingId === stage.id ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(stage.id)}
                className="h-8 text-sm flex-1"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleRename(stage.id)}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {stage.name}
              </span>
              <span className="text-xs text-zinc-400 font-mono mr-2">#{stage.orderIndex}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => { setEditingId(stage.id); setEditName(stage.name) }}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDelete(stage.id)}
                disabled={stages.length <= 1}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      ))}

      {isAdding ? (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-zinc-300 dark:border-white/20 bg-zinc-50 dark:bg-zinc-900">
          <Input
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Stage name..."
            className="h-8 text-sm flex-1"
            autoFocus
          />
          <Button size="sm" onClick={handleAdd} disabled={!newStageName.trim() || isPending}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewStageName('') }}>
            Cancel
          </Button>
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
