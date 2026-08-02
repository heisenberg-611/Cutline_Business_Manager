'use client'

import { useMemo, useRef, useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { encodeMention } from '../mentions'
import type { CommentAuthor } from '../actions/comments'

export function displayNameOf(user: Pick<CommentAuthor, 'firstName' | 'lastName' | 'email'>) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.email.split('@')[0] ||
    'Unknown user'
  )
}

/**
 * Textarea that turns "@" into a member picker.
 *
 * The picked user is inserted as `@[Name](userId)` so the mention survives a
 * rename and resolves to exactly one person. The token is visible in the box
 * while typing, which is a deliberate trade: a fully masked overlay would need
 * a contenteditable surface and its own caret handling.
 */
export function MentionInput({
  value,
  onChange,
  members,
  placeholder,
  disabled,
  rows = 3,
  onSubmit,
}: {
  value: string
  onChange: (next: string) => void
  members: CommentAuthor[]
  placeholder?: string
  disabled?: boolean
  rows?: number
  onSubmit?: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [query, setQuery] = useState<string | null>(null)
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null)
  const [highlighted, setHighlighted] = useState(0)

  const matches = useMemo(() => {
    if (query === null) return []
    const q = query.toLowerCase()
    return members
      .filter((m) => {
        if (!q) return true
        return (
          displayNameOf(m).toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
        )
      })
      .slice(0, 6)
  }, [query, members])

  /**
   * Opens the picker only when "@" starts a word, so an email address typed
   * into a comment does not trigger it.
   *
   * Resets the highlight here rather than in an effect keyed on `query`, which
   * would cause a cascading render on every keystroke.
   */
  function syncTrigger(next: string, caret: number) {
    const upToCaret = next.slice(0, caret)
    const at = upToCaret.lastIndexOf('@')
    setHighlighted(0)

    if (at === -1) {
      setQuery(null)
      setTriggerIndex(null)
      return
    }

    const charBefore = at === 0 ? '' : upToCaret[at - 1]
    const startsWord = at === 0 || /\s/.test(charBefore)
    const fragment = upToCaret.slice(at + 1)

    // A space or a closing token ends the mention attempt.
    if (!startsWord || /[\s\]()]/.test(fragment)) {
      setQuery(null)
      setTriggerIndex(null)
      return
    }

    setQuery(fragment)
    setTriggerIndex(at)
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    onChange(next)
    syncTrigger(next, e.target.selectionStart ?? next.length)
  }

  function pick(member: CommentAuthor) {
    if (triggerIndex === null) return
    const caret = textareaRef.current?.selectionStart ?? value.length
    const token = encodeMention(member.id, displayNameOf(member))
    const next = `${value.slice(0, triggerIndex)}${token} ${value.slice(caret)}`

    onChange(next)
    setQuery(null)
    setTriggerIndex(null)

    // Restore focus and place the caret after the inserted token.
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      const pos = triggerIndex + token.length + 1
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (query !== null && matches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlighted((h) => (h + 1) % matches.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlighted((h) => (h - 1 + matches.length) % matches.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        pick(matches[highlighted])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setQuery(null)
        setTriggerIndex(null)
        return
      }
    }

    // Cmd/Ctrl+Enter submits, so Enter stays available for newlines.
    if (onSubmit && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      onSubmit()
    }
  }

  const showPicker = query !== null && matches.length > 0

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="resize-none text-sm"
      />

      {showPicker && (
        <div
          role="listbox"
          aria-label="Mention a team member"
          className="absolute bottom-full left-0 z-50 mb-1 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {matches.map((member, i) => (
            <button
              key={member.id}
              type="button"
              role="option"
              aria-selected={i === highlighted}
              onMouseDown={(e) => {
                // mousedown, not click: the textarea must not blur first.
                e.preventDefault()
                pick(member)
              }}
              onMouseEnter={() => setHighlighted(i)}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                i === highlighted
                  ? 'bg-zinc-100 dark:bg-zinc-800'
                  : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold uppercase text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                {displayNameOf(member).slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-zinc-900 dark:text-zinc-100">
                  {displayNameOf(member)}
                </span>
                <span className="block truncate text-xs text-zinc-500">{member.email}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
