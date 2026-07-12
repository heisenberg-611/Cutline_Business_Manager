'use client'

import { useState, useCallback } from 'react'
import { createProject, checkProjectDuplicate } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, AlertTriangle } from 'lucide-react'

type Client = {
  id: string
  displayName: string
}

export function ProjectForm({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  
  // Track standard HTML form state for selects
  const [clientId, setClientId] = useState('')
  const [priority, setPriority] = useState('')
  const [title, setTitle] = useState('')

  const checkForDuplicate = useCallback(async (newTitle: string, newClientId: string) => {
    setDuplicateWarning(null)
    if (!newTitle.trim() || !newClientId) return

    try {
      const result = await checkProjectDuplicate(newTitle, newClientId)
      if (result.exists) {
        const clientName = clients.find(c => c.id === newClientId)?.displayName || 'this client'
        setDuplicateWarning(`A project named "${result.projectTitle}" already exists for ${clientName}. You can still create it if intended.`)
      }
    } catch {
      // Silently fail
    }
  }, [clients])

  async function handleSubmit(formData: FormData) {
    if (clientId) formData.set('clientId', clientId)
    if (priority) formData.set('priority', priority)

    setLoading(true)
    setError(null)
    try {
      await createProject(formData)
      setOpen(false)
      setClientId('')
      setPriority('')
      setTitle('')
      setDuplicateWarning(null)
    } catch (err: any) {
      setError(err?.message || "Error creating project.")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setError(null)
      setDuplicateWarning(null)
      setTitle('')
      setClientId('')
      setPriority('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger 
        render={
          <Button className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle>Create a New Project</DialogTitle>
          <DialogDescription>
            Assign a new project to an existing client.
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Q3 Marketing Ad"
              required
              value={title}
              onChange={(e) => { setTitle(e.target.value); setDuplicateWarning(null); setError(null) }}
              onBlur={() => checkForDuplicate(title, clientId)}
            />
          </div>

          <div className="space-y-2">
            <Label>Client *</Label>
            <Select
              value={clientId}
              onValueChange={(val) => {
                setClientId(val || '')
                setDuplicateWarning(null)
                if (title.trim() && val) {
                  checkForDuplicate(title, val)
                }
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a client">
                  {clients.find(c => c.id === clientId)?.displayName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false}>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {duplicateWarning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">Project Type</Label>
            <Input id="type" name="type" placeholder="e.g. YouTube Long-Form" />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(val) => setPriority(val || '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority">
                  {priority}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false}>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input id="deadline" name="deadline" type="date" />
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading || !clientId}>
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
