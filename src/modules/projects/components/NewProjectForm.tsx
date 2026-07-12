'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createProject, checkProjectDuplicate } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

type Client = {
  id: string
  displayName: string
}

export function NewProjectForm({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
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
      const newProject = await createProject(formData)
      // redirect to the new project
      if (newProject && newProject.id) {
        router.push(`/dashboard/projects/${newProject.id}`)
      } else {
        router.push('/dashboard/projects')
      }
    } catch (err: any) {
      setError(err?.message || "Error creating project.")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Create New Project
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            Set up a new video editing project and assign it to a client.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
        <form action={handleSubmit} className="space-y-5">
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
              className="bg-zinc-50 dark:bg-zinc-900/50"
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
              <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50">
                <SelectValue placeholder="Select a client">
                  {clients.find(c => c.id === clientId)?.displayName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" alignItemWithTrigger={false}>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                ))}
                {clients.length === 0 && (
                  <div className="p-2 text-sm text-zinc-500">No clients found. Create one first.</div>
                )}
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
            <Input id="type" name="type" placeholder="e.g. YouTube Long-Form" className="bg-zinc-50 dark:bg-zinc-900/50" />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(val) => setPriority(val || '')}>
              <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50">
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
            <Input id="deadline" name="deadline" type="date" className="bg-zinc-50 dark:bg-zinc-900/50" />
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading || !clientId} className="px-8">
              {loading ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
