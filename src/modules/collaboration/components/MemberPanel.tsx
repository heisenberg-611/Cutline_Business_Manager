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
import { Panel, PanelEmpty, PANEL_SCROLL_SIDE } from './Panel'
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

  const adder = canManage ? (
    addable.length === 0 ? (
      <p className="text-xs text-zinc-500">Everyone in this business is already on the project.</p>
    ) : (
      <div className="flex gap-2">
        <Select value={picked} onValueChange={(v) => setPicked(v || '')}>
          <SelectTrigger className="min-w-0 flex-1 text-sm" disabled={isPending}>
            <SelectValue placeholder="Add a teammate">
              {picked ? displayNameOf(addable.find((u) => u.id === picked)!) : 'Add a teammate'}
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
          size="icon"
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
    )
  ) : undefined

  return (
    <Panel
      icon={Users2}
      title="Members"
      count={members.length}
      scrollClassName={PANEL_SCROLL_SIDE}
      footer={adder}
    >
      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {members.length === 0 && (
          <li>
            <PanelEmpty>No one has been added to this project yet.</PanelEmpty>
          </li>
        )}

        {members.map((member) => {
          // The lead's role is fixed, so those rows are read-only regardless of
          // whether the viewer can manage the list.
          const editable = canManage && !member.isLead

          return (
            // Identity on the first line, controls on their own line beneath.
            // The old single row wrapped once the panel got narrow, stranding
            // the role select mid-row with dead space beside it.
            <li
              key={member.userId}
              className="px-4 py-3 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-semibold uppercase text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {member.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    displayNameOf(member).slice(0, 2)
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {displayNameOf(member)}
                        </span>
                        {member.isLead && (
                          <span
                            title="Project lead"
                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                          >
                            <Crown className="h-3 w-3" />
                            Lead
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">{member.email}</span>
                    </div>

                    {!editable && (
                      <span
                        title={ROLE_HINT[member.role]}
                        className="shrink-0 text-xs text-zinc-500"
                      >
                        {ROLE_LABEL[member.role]}
                      </span>
                    )}
                  </div>

                  {editable && (
                    // The select takes the leftover width so the row cannot end
                    // in a gap, with remove pinned to the edge.
                    <div className="mt-2 flex items-center gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          v &&
                          run(() =>
                            updateProjectMemberRole(projectId, member.userId, v as ProjectMemberRole)
                          )
                        }
                      >
                        <SelectTrigger
                          className="h-7 min-w-0 flex-1 text-xs"
                          title={ROLE_HINT[member.role]}
                          disabled={isPending}
                        >
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

                      <button
                        type="button"
                        onClick={() => run(() => removeProjectMember(projectId, member.userId))}
                        disabled={isPending}
                        aria-label={`Remove ${displayNameOf(member)}`}
                        className="-m-1 shrink-0 rounded-md p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
