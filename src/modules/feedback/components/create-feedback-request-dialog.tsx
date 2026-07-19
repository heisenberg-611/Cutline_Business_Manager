'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createFeedbackRequest } from '@/modules/feedback/actions'

import { Project, Client } from '@prisma/client'

export function CreateFeedbackRequestDialog({ 
  projects 
}: { 
  projects: (Project & { client: Client })[]
}) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const router = useRouter()

  const handleCreate = async () => {
    if (!selectedProjectId) return
    const project = projects.find(p => p.id === selectedProjectId)
    if (!project) return

    setIsSubmitting(true)
    try {
      await createFeedbackRequest(project.id, project.clientId)
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Failed to create request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full sm:w-auto bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90" />}>
        Generate Feedback Link
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle>Generate Feedback Link</DialogTitle>
          <DialogDescription>
            Select a project to generate a new feedback request link for the associated client.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Select value={selectedProjectId} onValueChange={(val) => setSelectedProjectId(val as string)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project">
                {selectedProjectId 
                  ? (() => {
                      const p = projects.find(proj => proj.id === selectedProjectId)
                      return p ? `${p.title} (${p.client.displayName})` : 'Select a project'
                    })()
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {projects.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground text-center">No projects available</div>
              )}
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title} ({p.client.displayName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!selectedProjectId || isSubmitting}>
            {isSubmitting ? 'Generating...' : 'Generate Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
