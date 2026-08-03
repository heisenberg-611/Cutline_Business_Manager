'use client'

import { useEffect, useOptimistic, useState, useTransition } from 'react'
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DraggableProvidedDragHandleProps,
  type DropResult,
} from '@hello-pangea/dnd'
import { format, formatDistanceStrict, formatDistanceToNow, isBefore, startOfDay } from 'date-fns'
import { CheckSquare, Clock, GripVertical, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TaskStatus } from '@prisma/client'
import {
  createTask,
  deleteTask,
  reorderTasks,
  updateTask,
  updateTaskStatus,
  type TaskRow,
} from '../actions/tasks'
import { displayNameOf } from './MentionInput'
import type { CommentAuthor } from '../actions/comments'

const UNASSIGNED = '__unassigned__'

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
}

const STATUS_STYLE: Record<TaskStatus, string> = {
  TODO: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  BLOCKED: 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  DONE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
}

type TaskAction =
  | { type: 'status'; id: string; status: TaskStatus }
  | { type: 'assign'; id: string; assigneeId: string | null }
  | { type: 'delete'; id: string }
  | { type: 'reorder'; ids: string[] }
  | { type: 'add'; title: string }

function applyAction(state: TaskRow[], action: TaskAction): TaskRow[] {
  switch (action.type) {
    case 'status':
      return state.map((t) => (t.id === action.id ? { ...t, status: action.status } : t))
    case 'assign':
      return state.map((t) =>
        t.id === action.id ? { ...t, assigneeId: action.assigneeId } : t
      )
    case 'delete':
      return state.filter((t) => t.id !== action.id)
    case 'reorder': {
      const byId = new Map(state.map((t) => [t.id, t]))
      return action.ids.flatMap((id) => byId.get(id) ?? [])
    }
    case 'add':
      return [
        ...state,
        {
          id: `pending-${action.title}`,
          title: action.title,
          description: null,
          status: 'TODO',
          assigneeId: null,
          dueDate: null,
          orderIndex: state.length,
          createdAt: new Date(),
          completedAt: null,
        },
      ]
  }
}

export function TaskPanel({
  projectId,
  tasks: serverTasks,
  members,
  canEdit,
}: {
  projectId: string
  tasks: TaskRow[]
  members: CommentAuthor[]
  canEdit: boolean
}) {
  const [newTitle, setNewTitle] = useState('')
  const [isPending, startTransition] = useTransition()

  // useOptimistic rather than mirroring the prop into state: React reverts to
  // the server value when the transition settles, so a failed action needs no
  // manual rollback and a successful one cannot drift from what was persisted.
  const [tasks, applyOptimistic] = useOptimistic(serverTasks, applyAction)

  // dnd cannot run during hydration; render a static list until mounted.
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot mount flag; same pattern as PipelineBoard
    setIsMounted(true)
  }, [])

  const memberById = new Map(members.map((m) => [m.id, m]))
  const doneCount = tasks.filter((t) => t.status === 'DONE').length

  function run(optimistic: TaskAction, action: () => Promise<unknown>, onError?: () => void) {
    startTransition(async () => {
      applyOptimistic(optimistic)
      try {
        await action()
      } catch (error) {
        onError?.()
        toast.error(error instanceof Error ? error.message : 'Something went wrong')
      }
    })
  }

  function handleAdd() {
    const title = newTitle.trim()
    if (!title) return
    setNewTitle('')
    run({ type: 'add', title }, () => createTask({ projectId, title }), () =>
      setNewTitle(title)
    )
  }

  function handleStatus(task: TaskRow, next: TaskStatus) {
    run({ type: 'status', id: task.id, status: next }, () =>
      updateTaskStatus(task.id, next)
    )
  }

  function handleToggle(task: TaskRow) {
    handleStatus(task, task.status === 'DONE' ? 'TODO' : 'DONE')
  }

  function handleAssign(task: TaskRow, value: string) {
    const assigneeId = value === UNASSIGNED ? null : value
    run({ type: 'assign', id: task.id, assigneeId }, () =>
      updateTask(task.id, { assigneeId })
    )
  }

  function handleDelete(task: TaskRow) {
    run({ type: 'delete', id: task.id }, () => deleteTask(task.id))
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source } = result
    if (!destination || destination.index === source.index) return

    const reordered = Array.from(tasks)
    const [moved] = reordered.splice(source.index, 1)
    reordered.splice(destination.index, 0, moved)
    const ids = reordered.map((t) => t.id)

    run({ type: 'reorder', ids }, () => reorderTasks(projectId, ids))
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
        <CheckSquare className="h-4 w-4 text-zinc-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Tasks</h3>
        {tasks.length > 0 && (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {doneCount}/{tasks.length}
          </span>
        )}
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No tasks yet. Break the project into steps your team can pick up.
          </p>
        ) : !isMounted ? (
          // Static list until mounted, so dnd does not run during hydration.
          tasks.map((task) => (
            <TaskRowView
              key={task.id}
              task={task}
              members={members}
              memberById={memberById}
              canEdit={false}
              isPending
              onToggle={() => {}}
              onStatus={() => {}}
              onAssign={() => {}}
              onDelete={() => {}}
            />
          ))
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="tasks">
              {(dropProvided) => (
                <div ref={dropProvided.innerRef} {...dropProvided.droppableProps}>
                  {tasks.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                      isDragDisabled={!canEdit || isPending}
                    >
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={
                            snapshot.isDragging
                              ? 'bg-white shadow-lg dark:bg-zinc-800'
                              : 'bg-transparent'
                          }
                        >
                          <TaskRowView
                            task={task}
                            members={members}
                            memberById={memberById}
                            canEdit={canEdit}
                            isPending={isPending}
                            dragHandleProps={dragProvided.dragHandleProps}
                            onToggle={() => handleToggle(task)}
                            onStatus={(s) => handleStatus(task, s)}
                            onAssign={(v) => handleAssign(task, v)}
                            onDelete={() => handleDelete(task)}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {canEdit && (
        <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
          <div className="flex gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              placeholder="Add a task and press Enter"
              disabled={isPending}
              className="h-9 text-sm"
            />
            <Button size="sm" onClick={handleAdd} disabled={isPending || !newTitle.trim()}>
              <Plus className="h-4 w-4" />
              <span className="sr-only">Add task</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Created-at, and how long the task took once it is done.
 *
 * completedAt is cleared when a task is reopened, so "took" only ever describes
 * a run that actually finished rather than a stale timestamp.
 */
function TaskTiming({ task }: { task: TaskRow }) {
  const created = new Date(task.createdAt)
  const done = task.status === 'DONE' && task.completedAt ? new Date(task.completedAt) : null

  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-zinc-400">
      <Clock className="h-3 w-3 shrink-0" />
      <span title={format(created, 'PPpp')}>
        created {formatDistanceToNow(created, { addSuffix: true })}
      </span>
      {done && (
        <>
          <span aria-hidden>·</span>
          <span
            title={`Completed ${format(done, 'PPpp')}`}
            className="font-medium text-emerald-600 dark:text-emerald-400"
          >
            {/* Sub-minute completions read as "0 minutes"; call those instant. */}
            took {done.getTime() - created.getTime() < 60_000
              ? 'under a minute'
              : formatDistanceStrict(done, created)}
          </span>
        </>
      )}
    </span>
  )
}

function TaskRowView({
  task,
  members,
  memberById,
  canEdit,
  isPending,
  dragHandleProps,
  onToggle,
  onStatus,
  onAssign,
  onDelete,
}: {
  task: TaskRow
  members: CommentAuthor[]
  memberById: Map<string, CommentAuthor>
  canEdit: boolean
  isPending: boolean
  dragHandleProps?: DraggableProvidedDragHandleProps | null
  onToggle: () => void
  onStatus: (status: TaskStatus) => void
  onAssign: (value: string) => void
  onDelete: () => void
}) {
  const assignee = task.assigneeId ? memberById.get(task.assigneeId) : null
  const isDone = task.status === 'DONE'
  const overdue =
    !!task.dueDate && !isDone && isBefore(new Date(task.dueDate), startOfDay(new Date()))

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {canEdit && (
        <span
          {...(dragHandleProps ?? {})}
          className="cursor-grab text-zinc-300 transition-colors hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
          aria-label="Reorder task"
        >
          <GripVertical className="h-4 w-4" />
        </span>
      )}

      <button
        type="button"
        onClick={onToggle}
        disabled={!canEdit || isPending}
        aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors disabled:opacity-50 ${
          isDone
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-600'
        }`}
      >
        {isDone && <CheckSquare className="h-3 w-3" />}
      </button>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm ${
            isDone
              ? 'text-zinc-400 line-through dark:text-zinc-500'
              : 'text-zinc-800 dark:text-zinc-200'
          }`}
          title={task.title}
        >
          {task.title}
        </span>
        <TaskTiming task={task} />
      </span>

      {task.dueDate && (
        <span
          className={`hidden shrink-0 text-xs sm:inline ${
            overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-zinc-400'
          }`}
        >
          {format(new Date(task.dueDate), 'MMM d')}
        </span>
      )}

      {canEdit ? (
        <Select value={task.status} onValueChange={(v) => v && onStatus(v as TaskStatus)}>
          <SelectTrigger className="h-7 w-[118px] shrink-0 text-xs" disabled={isPending}>
            <SelectValue>{STATUS_LABEL[task.status]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[task.status]}`}
        >
          {STATUS_LABEL[task.status]}
        </span>
      )}

      {canEdit ? (
        <Select
          value={task.assigneeId ?? UNASSIGNED}
          onValueChange={(v) => v && onAssign(v)}
        >
          <SelectTrigger className="h-7 w-[128px] shrink-0 text-xs" disabled={isPending}>
            <SelectValue>{assignee ? displayNameOf(assignee) : 'Unassigned'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {displayNameOf(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="shrink-0 text-xs text-zinc-500">
          {assignee ? displayNameOf(assignee) : 'Unassigned'}
        </span>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending}
          aria-label="Delete task"
          className="shrink-0 text-zinc-300 transition-colors hover:text-red-600 disabled:opacity-50 dark:text-zinc-600 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
