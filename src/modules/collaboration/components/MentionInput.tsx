'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Textarea } from '@/components/ui/textarea'
import type { MentionDraft } from '../mentions'
import type { CommentAuthor } from '../actions/comments'

/**
 * Ceiling on how many people the picker offers at once. The list scrolls, so
 * this is only a guard against rendering an entire large organization.
 */
const MAX_MATCHES = 50

/** Keep in step with the max-h-60 on the list (15rem). */
const PICKER_MAX_HEIGHT = 240

/** Wide enough for a name and email, without spanning a full-width composer. */
const PICKER_MAX_WIDTH = 320

/** Where the portalled picker pins itself, in viewport coordinates. */
type Anchor = { left: number; top: number; bottom: number; width: number }

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
 * The author only ever sees `@Kai Osei`. The user id is carried alongside in
 * the draft and reattached as `@[Kai Osei](user_abc)` at submit, so the storage
 * format still survives a rename and resolves to exactly one person without the
 * id cluttering the box — or being corruptible by a stray keystroke.
 */
export function MentionInput({
  draft,
  onChange,
  members,
  placeholder,
  disabled,
  rows = 3,
  onSubmit,
}: {
  draft: MentionDraft
  onChange: (next: MentionDraft) => void
  members: CommentAuthor[]
  placeholder?: string
  disabled?: boolean
  rows?: number
  onSubmit?: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [openUpward, setOpenUpward] = useState(true)
  const [anchor, setAnchor] = useState<Anchor | null>(null)
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
      // The list scrolls, so it no longer has to be trimmed to what fits.
      .slice(0, MAX_MATCHES)
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
    onChange({ ...draft, text: next })
    syncTrigger(next, e.target.selectionStart ?? next.length)
  }

  function pick(member: CommentAuthor) {
    if (triggerIndex === null) return
    const caret = textareaRef.current?.selectionStart ?? draft.text.length
    const name = displayNameOf(member)
    // Insert the readable name only. The id is held alongside and reattached at
    // submit, so it never appears in the box the author is typing into.
    const token = `@${name}`
    const next = `${draft.text.slice(0, triggerIndex)}${token} ${draft.text.slice(caret)}`

    onChange({
      text: next,
      mentions: { ...draft.mentions, [name]: member.id },
    })
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

  // Arrow keys can move the highlight past the visible window now that the list
  // scrolls, so keep the active row in view. Runs on hover too, where the row is
  // already visible and this is a no-op.
  useEffect(() => {
    const item = listRef.current?.children[highlighted] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  /**
   * Measures the textarea so the portalled picker can be pinned to it.
   *
   * The picker normally opens upward, which suits a composer sitting at the
   * bottom of its card; near the top of the viewport there is no room, so it
   * flips downward instead.
   */
  const measure = useCallback(() => {
    const box = textareaRef.current?.getBoundingClientRect()
    if (!box) return

    // Scrolled out of sight inside a panel — nothing to anchor to.
    if (box.bottom < 0 || box.top > window.innerHeight) {
      setAnchor(null)
      return
    }

    const spaceAbove = box.top
    const spaceBelow = window.innerHeight - box.bottom
    setOpenUpward(spaceAbove >= PICKER_MAX_HEIGHT || spaceAbove >= spaceBelow)

    const width = Math.min(box.width, PICKER_MAX_WIDTH)
    setAnchor({
      // Keep it on screen if the composer sits near the right edge.
      left: Math.max(8, Math.min(box.left, window.innerWidth - width - 8)),
      top: box.top,
      bottom: box.bottom,
      width,
    })
  }, [])

  // Re-measure while anything scrolls or the window resizes. The listener is
  // capturing so it also fires for scrolls inside the panel, not just the page.
  useEffect(() => {
    if (query === null) return
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [query, measure])

  const showPicker = query !== null && matches.length > 0 && anchor !== null

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={draft.text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className="resize-none text-sm"
      />

      {showPicker &&
        createPortal(
          <div
            role="listbox"
            aria-label="Mention a team member"
            ref={listRef}
            // Portalled to the body and positioned in viewport coordinates, so
            // no scrolling ancestor can clip it — the discussion pane scrolls
            // its own comments, and this used to be cut off by that.
            // max-h + overflow-y so a long member list scrolls; overscroll-contain
            // stops that scroll chaining to whatever is behind it.
            style={{
              position: 'fixed',
              left: anchor.left,
              width: anchor.width,
              ...(openUpward
                ? { bottom: window.innerHeight - anchor.top + 4 }
                : { top: anchor.bottom + 4 }),
            }}
            className="z-50 max-h-60 overflow-y-auto overscroll-contain rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
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
          </div>,
          document.body
        )}
    </div>
  )
}
