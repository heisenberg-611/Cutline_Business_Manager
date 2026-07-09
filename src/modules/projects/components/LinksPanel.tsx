'use client'

import React, { useState, useTransition } from 'react'
import { addLink, deleteLink } from '../detail-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LinkIcon, Trash2, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

type ProjectLink = {
  id: string
  url: string
  label: string
  createdAt: Date
}

export function LinksPanel({ projectId, links }: { projectId: string, links: ProjectLink[] }) {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim() || !label.trim()) return

    startTransition(async () => {
      try {
        await addLink(projectId, url, label)
        setUrl('')
        setLabel('')
      } catch (error) {
        alert("Failed to add link")
      }
    })
  }

  const handleDelete = (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return
    
    startTransition(async () => {
      try {
        await deleteLink(linkId, projectId)
      } catch (error) {
        alert("Failed to delete link")
      }
    })
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          Project Links
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {links.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No links yet. Add project drive files or references below!</p>
        ) : (
          links.map(link => (
            <div key={link.id} className="group flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
              <div className="flex flex-col overflow-hidden mr-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                  {link.label}
                </span>
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                >
                  {link.url}
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                onClick={() => handleDelete(link.id)}
                disabled={isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Input 
              placeholder="Label (e.g. Google Drive)" 
              value={label}
              onChange={e => setLabel(e.target.value)}
              disabled={isPending}
              className="h-8 text-sm"
              required
            />
            <Input 
              placeholder="URL (https://...)" 
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={isPending}
              className="h-8 text-sm"
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isPending || !url.trim() || !label.trim()} size="sm" className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending ? 'Adding...' : 'Add Link'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
