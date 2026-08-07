'use client'

import { useOptimistic, useState, useTransition } from 'react'
import { SmilePlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toggleReaction } from '../actions'
import type { ReactionGroup, ReactionTarget } from '../reactions'

/**
 * The row of reaction pills under a message or a comment.
 *
 * One component for both surfaces: the only thing that differs is what is being
 * reacted to, which is a pair of strings. Keeping it single means the counting,
 * the toggle semantics and the keyboard behaviour cannot drift between the
 * thread and the discussion.
 */
export function ReactionBar({
  targetType,
  targetId,
  reactions,
  emojiSet,
  canReact = true,
  align = 'start',
}: {
  targetType: ReactionTarget
  targetId: string
  reactions: ReactionGroup[]
  /** What this workspace offers, in the order an admin arranged it. */
  emojiSet: string[]
  canReact?: boolean
  align?: 'start' | 'end'
}) {
  const [isPending, startTransition] = useTransition()
  const [pickerOpen, setPickerOpen] = useState(false)

  // The server returns the target's full group list, so a reply is a straight
  // replacement rather than a merge — and useOptimistic reverts on failure
  // without any rollback of our own.
  const [groups, setGroups] = useState(reactions)
  const [optimistic, applyOptimistic] = useOptimistic(groups, toggled)

  function react(emoji: string) {
    setPickerOpen(false)
    startTransition(async () => {
      applyOptimistic(emoji)
      try {
        setGroups(await toggleReaction(targetType, targetId, emoji))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not react')
      }
    })
  }

  // Only what is still offered can be added; existing pills stay visible even
  // if an admin has since dropped that emoji, because someone did react with it.
  const unused = emojiSet.filter((emoji) => !optimistic.some((g) => g.emoji === emoji))

  if (!canReact && optimistic.length === 0) return null

  return (
    <div
      className={cn(
        'mt-1 flex flex-wrap items-center gap-1',
        align === 'end' && 'justify-end'
      )}
    >
      {optimistic.map((group) => (
        <button
          key={group.emoji}
          type="button"
          disabled={!canReact || isPending}
          onClick={() => react(group.emoji)}
          aria-pressed={group.reacted}
          aria-label={`${group.emoji} ${group.count}${group.reacted ? ', including you' : ''}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] leading-none transition-colors disabled:opacity-60',
            group.reacted
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300'
              : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10'
          )}
        >
          <span aria-hidden>{group.emoji}</span>
          <span className="tabular-nums font-medium">{group.count}</span>
        </button>
      ))}

      {canReact && unused.length > 0 && (
        <DropdownMenu open={pickerOpen} onOpenChange={setPickerOpen}>
          <DropdownMenuTrigger
            aria-label="Add a reaction"
            className={cn(
              'inline-flex items-center rounded-full border border-dashed border-zinc-300 p-1 text-zinc-400 outline-none transition-colors hover:border-zinc-400 hover:text-zinc-600 dark:border-white/15 dark:hover:text-zinc-200'
            )}
          >
            <SmilePlus className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align={align} className="flex w-auto min-w-0 gap-0.5 p-1">
            {unused.map((emoji) => (
              // Not DropdownMenuItem: a grid of emoji reads better as buttons
              // than as a stack of menu rows.
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                aria-label={`React with ${emoji}`}
                className="rounded px-1.5 py-1 text-base leading-none transition-colors hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                {emoji}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

/**
 * Applies a toggle locally, so the pill responds on click rather than on the
 * round trip. The server's reply replaces this wholesale.
 */
function toggled(groups: ReactionGroup[], emoji: string): ReactionGroup[] {
  const existing = groups.find((g) => g.emoji === emoji)
  if (!existing) return [...groups, { emoji, count: 1, reacted: true }]

  if (existing.reacted) {
    // Last one out removes the pill entirely rather than leaving a zero.
    return existing.count <= 1
      ? groups.filter((g) => g.emoji !== emoji)
      : groups.map((g) => (g.emoji === emoji ? { ...g, count: g.count - 1, reacted: false } : g))
  }

  return groups.map((g) => (g.emoji === emoji ? { ...g, count: g.count + 1, reacted: true } : g))
}
