'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, Trash, Archive, ArchiveRestore } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateProject, deleteProject, archiveProject, unarchiveProject } from '../actions'
import { format } from 'date-fns'

type Project = {
  id: string
  title: string
  priority: string | null
  deadline: Date | null
  isArchived?: boolean
}

export function ProjectActions({ project }: { project: Project }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    title: project.title,
    priority: project.priority || 'Medium',
    deadline: project.deadline ? format(new Date(project.deadline), 'yyyy-MM-dd') : ''
  })

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        await updateProject(project.id, {
          title: formData.title,
          priority: formData.priority,
          deadline: formData.deadline ? new Date(formData.deadline) : null
        })
        setIsEditOpen(false)
      } catch (err) {
        alert("Failed to update project")
      }
    })
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${project.title}? This will delete all associated notes, time entries, and pipeline history.`)) {
      startTransition(async () => {
        try {
          await deleteProject(project.id)
          router.push('/dashboard/projects')
        } catch (err) {
          alert("Failed to delete project")
        }
      })
    }
  }

  const handleArchive = () => {
    if (confirm(`Are you sure you want to archive ${project.title}?`)) {
      startTransition(async () => {
        try {
          await archiveProject(project.id)
        } catch (err) {
          alert("Failed to archive project")
        }
      })
    }
  }

  const handleUnarchive = () => {
    startTransition(async () => {
      try {
        await unarchiveProject(project.id)
      } catch (err) {
        alert("Failed to unarchive project")
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        {project.isArchived ? (
          <Button variant="outline" size="sm" onClick={handleUnarchive} title="Unarchive Project">
            <ArchiveRestore className="h-4 w-4 text-emerald-600" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleArchive} title="Archive Project">
            <Archive className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" title="Delete Project">
          <Trash className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={val => setFormData({ ...formData, priority: val || 'Medium' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
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
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={e => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
