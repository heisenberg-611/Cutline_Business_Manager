'use client'

import React, { useState, useTransition } from 'react'
import { addNote } from '../detail-actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'

type Note = {
  id: string
  type: string
  content: string
  createdAt: Date
}

export function NotesPanel({ projectId, notes }: { projectId: string, notes: Note[] }) {
  const [content, setContent] = useState('')
  const [type, setType] = useState('idea')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    startTransition(async () => {
      try {
        await addNote(projectId, content, type)
        setContent('')
      } catch (error) {
        alert("Failed to add note")
      }
    })
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Project Notes</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {notes.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No notes yet. Add one below!</p>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  {note.type}
                </span>
                <span className="text-xs text-zinc-400">
                  {format(new Date(note.createdAt), 'MMM d, h:mm a')}
                </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Select value={type} onValueChange={(val) => setType(val || 'idea')} disabled={isPending}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue>
                {type === 'idea' ? 'Idea' : 
                 type === 'client' ? 'Client Note' : 
                 type === 'shot' ? 'Shot Note' : 
                 type === 'todo' ? 'To-Do' : 'Select'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="client">Client Note</SelectItem>
              <SelectItem value="shot">Shot Note</SelectItem>
              <SelectItem value="todo">To-Do</SelectItem>
            </SelectContent>
          </Select>
          
          <Textarea 
            placeholder="Jot down a note..." 
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={isPending}
            className="min-h-[80px] text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending || !content.trim()} size="sm" className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending ? 'Saving...' : 'Add Note'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
