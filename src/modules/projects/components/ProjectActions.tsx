'use client'

import React, { useState, useTransition } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Edit, Trash, Archive, ArchiveRestore } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateProject, deleteProject, archiveProject, unarchiveProject } from '../actions'
import { FeedbackPromptModal } from '../../workflow/components/FeedbackPromptModal'
import { format } from 'date-fns'

type Project = {
  id: string
  title: string
  priority: string | null
  deadline: Date | null
  isArchived?: boolean
  assigneeId?: string | null
  clientId?: string
  clientHasEmail?: boolean
}

type Member = {
  user: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
    imageUrl?: string | null
  }
}

export function ProjectActions({ project, members = [] }: { project: Project, members?: Member[] }) {
  const { orgRole } = useAuth()
  const isAdmin = orgRole === 'org:admin'
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    title: project.title,
    priority: project.priority || 'Medium',
    deadline: project.deadline ? format(new Date(project.deadline), 'yyyy-MM-dd') : '',
    assigneeId: project.assigneeId || 'unassigned'
  })

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        await updateProject(project.id, {
          title: formData.title,
          priority: formData.priority,
          deadline: formData.deadline ? new Date(formData.deadline) : null,
          ...(isAdmin && formData.assigneeId !== project.assigneeId && {
            assigneeId: formData.assigneeId === 'unassigned' ? null : formData.assigneeId
          })
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
      <div className="flex items-center gap-2 flex-wrap">
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
        {isAdmin && project.clientId && (
          <Button variant="default" size="sm" onClick={() => setIsFeedbackOpen(true)} className="ml-2">
            Request Feedback
          </Button>
        )}
      </div>

      {isAdmin && project.clientId && (
        <FeedbackPromptModal
          open={isFeedbackOpen}
          onOpenChange={setIsFeedbackOpen}
          projectId={project.id}
          clientId={project.clientId}
          clientHasEmail={!!project.clientHasEmail}
          projectName={project.title}
        />
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
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
                <SelectContent align="start" alignItemWithTrigger={false}>
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
            
            {isAdmin && members.length > 0 && (
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select 
                  value={formData.assigneeId} 
                  onValueChange={val => setFormData({ ...formData, assigneeId: val || 'unassigned' })}
                >
                  <SelectTrigger className="h-auto py-2">
                    <SelectValue placeholder="Unassigned">
                      {formData.assigneeId && formData.assigneeId !== 'unassigned'
                        ? (() => {
                            const user = members.find(m => m.user.id === formData.assigneeId)?.user;
                            if (!user) return 'Unassigned';
                            const rawName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                            const name = rawName || user.email.split('@')[0] || 'Unknown User';
                            return (
                              <span className="flex items-center gap-2 text-left">
                                {user.imageUrl ? (
                                  <img src={user.imageUrl} alt={name} className="h-6 w-6 rounded-full object-cover shrink-0" />
                                ) : (
                                  <span className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">
                                    {name.charAt(0).toUpperCase()}
                                  </span>
                                )}
                                <span className="flex flex-col truncate">
                                  <span className="text-sm font-medium truncate leading-none">{name}</span>
                                  <span className="text-[10px] text-zinc-500 truncate mt-1 leading-none">{user.email}</span>
                                </span>
                              </span>
                            );
                          })()
                        : 'Unassigned'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" alignItemWithTrigger={false} className="w-max min-w-[var(--anchor-width)]">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map(m => {
                      const rawName = `${m.user.firstName || ''} ${m.user.lastName || ''}`.trim();
                      const name = rawName || m.user.email.split('@')[0] || 'Unknown User';
                      return (
                        <SelectItem key={m.user.id} value={m.user.id}>
                          <span className="flex items-center gap-2 py-1 w-full min-w-0">
                          {m.user.imageUrl ? (
                            <img src={m.user.imageUrl} alt={name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                          ) : (
                            <span className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-medium shrink-0">
                              {name.charAt(0).toUpperCase()}
                            </span>
                          )}
                          <span className="flex flex-col min-w-0">
                            <span className="text-sm font-medium leading-tight">{name}</span>
                            <span className="text-xs text-zinc-500 leading-tight">{m.user.email}</span>
                          </span>
                        </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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
