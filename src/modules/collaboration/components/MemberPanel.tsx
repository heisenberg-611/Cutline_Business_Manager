'use client'

import { useState, useTransition } from 'react'
import { Users2, Plus, X, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProjectMemberRole } from '@prisma/client'
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  type ProjectMemberRow,
} from '../actions/members'
import { displayNameOf } from './MentionInput'
import type { CommentAuthor } from '../actions/comments'

const ROLE_LABEL: Record<ProjectMemberRole, string> = {
  OWNER: 'Owner',
  COLLABORATOR: 'Collaborator',
  WATCHER: 'Watcher',
}

const ROLE_HINT: Record<ProjectMemberRole, string> = {
  OWNER: 'Full access, can manage this list',
  COLLABORATOR: 'Can edit the project and its tasks',
  WATCHER: 'Read-only, still gets notified',
}

export function MemberPanel({
  projectId,
  members,
  addable,
  canManage,
}: {
  projectId: string
  members: ProjectMemberRow[]
  addable: CommentAuthor[]
  canManage: boolean
}) {
  const [picked, setPicked] = useState('')
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      try {
        await action()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
        <Users2 className="h-4 w-4 text-zinc-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Members</h3>
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          {members.length}
        </span>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {members.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-zinc-500">
            No one has been added to this project yet.
          </li>
        )}

        {members.map((member) => (
          <li key={member.userId} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-semibold uppercase text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {member.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                displayNameOf(member).slice(0, 2)
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {displayNameOf(member)}
                </span>
                {member.isLead && (
                  <span
                    title="Project lead"
                    className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                  >
                    <Crown className="h-3 w-3" />
                    Lead
                  </span>
                )}
              </span>
              <span className="block truncate text-xs text-zinc-500">{member.email}</span>
            </span>

            {canManage && !member.isLead ? (
              <Select
                value={member.role}
                onValueChange={(v) =>
                  v && run(() => updateProjectMemberRole(projectId, member.userId, v as ProjectMemberRole))
                }
              >
                <SelectTrigger className="h-7 w-[132px] shrink-0 text-xs" disabled={isPending}>
                  <SelectValue>{ROLE_LABEL[member.role]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABEL) as ProjectMemberRole[]).map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span
                title={ROLE_HINT[member.role]}
                className="shrink-0 text-xs text-zinc-500"
              >
                {ROLE_LABEL[member.role]}
              </span>
            )}

            {canManage && !member.isLead && (
              <button
                type="button"
                onClick={() => run(() => removeProjectMember(projectId, member.userId))}
                disabled={isPending}
                aria-label={`Remove ${displayNameOf(member)}`}
                className="shrink-0 text-zinc-300 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-zinc-600 dark:hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
          {addable.length === 0 ? (
            <p className="text-xs text-zinc-500">
              Everyone in this business is already on the project.
            </p>
          ) : (
            <div className="flex gap-2">
              <Select value={picked} onValueChange={(v) => setPicked(v || '')}>
                <SelectTrigger className="h-9 flex-1 text-sm" disabled={isPending}>
                  <SelectValue placeholder="Add a teammate">
                    {picked
                      ? displayNameOf(addable.find((u) => u.id === picked)!)
                      : 'Add a teammate'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {addable.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {displayNameOf(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={isPending || !picked}
                onClick={() => {
                  const userId = picked
                  setPicked('')
                  run(() => addProjectMember(projectId, userId))
                }}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add member</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
