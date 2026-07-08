'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type Client = {
  id: string
  displayName: string
}

export function NewProjectForm({ clients }: { clients: Client[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState('')
  const [priority, setPriority] = useState('')

  async function handleSubmit(formData: FormData) {
    if (clientId) formData.set('clientId', clientId)
    if (priority) formData.set('priority', priority)

    setLoading(true)
    try {
      const newProject = await createProject(formData)
      // redirect to the new project
      if (newProject && newProject.id) {
        router.push(`/dashboard/projects/${newProject.id}`)
      } else {
        router.push('/dashboard/projects')
      }
    } catch (error) {
      console.error("Failed to create project", error)
      alert("Error creating project.")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <Link href="/dashboard/projects">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900">
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
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input id="title" name="title" placeholder="e.g. Q3 Marketing Ad" required className="bg-zinc-50 dark:bg-zinc-900/50" />
          </div>

          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={(val) => setClientId(val || '')} required>
              <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900/50">
                <SelectValue placeholder="Select a client">
                  {clients.find(c => c.id === clientId)?.displayName}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
                ))}
                {clients.length === 0 && (
                  <div className="p-2 text-sm text-zinc-500">No clients found. Create one first.</div>
                )}
              </SelectContent>
            </Select>
          </div>

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
              <SelectContent>
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
