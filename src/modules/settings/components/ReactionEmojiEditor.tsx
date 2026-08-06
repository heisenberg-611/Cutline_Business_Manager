'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { X, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateReactionEmojis } from '@/modules/settings/actions'
import {
  DEFAULT_REACTION_EMOJIS,
  MAX_REACTION_EMOJIS,
  normalizeEmojiSet,
} from '@/modules/reactions/reactions'

/**
 * The reactions everyone in the workspace can use.
 *
 * Saved on an explicit click rather than on every edit: this is a shared list,
 * and an admin part-way through rearranging it should not be pushing each
 * intermediate state out to their team.
 */
export function ReactionEmojiEditor({ initialEmojis }: { initialEmojis: string[] }) {
  const start = initialEmojis.length > 0 ? initialEmojis : DEFAULT_REACTION_EMOJIS
  const [emojis, setEmojis] = useState<string[]>(start)
  const [saved, setSaved] = useState<string[]>(start)
  const [draft, setDraft] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const dirty = emojis.join(' ') !== saved.join(' ')
  const full = emojis.length >= MAX_REACTION_EMOJIS

  function add() {
    const candidate = draft.trim()
    if (!candidate) return
    if (emojis.includes(candidate)) {
      toast.error('That one is already on the list.')
      return
    }
    if (full) {
      toast.error(`Up to ${MAX_REACTION_EMOJIS} reactions.`)
      return
    }
    setEmojis((prev) => [...prev, candidate])
    setDraft('')
  }

  async function save() {
    const cleaned = normalizeEmojiSet(emojis)
    if (!cleaned) {
      toast.error('Keep at least one reaction.')
      return
    }

    setIsSaving(true)
    try {
      // The server returns what it stored, so the field shows the saved truth
      // rather than what was typed.
      const stored = await updateReactionEmojis(cleaned)
      setEmojis(stored)
      setSaved(stored)
      toast.success('Reactions updated.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save reactions.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Available reactions
        </label>
        <p className="text-xs text-zinc-500">
          Everyone here can use these on messages and project discussions. Removing one
          takes it out of the picker; reactions already given stay counted.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {emojis.map((emoji) => (
          <span
            key={emoji}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 py-1 pl-2.5 pr-1.5 text-base dark:border-white/10 dark:bg-white/5"
          >
            <span aria-hidden>{emoji}</span>
            <button
              type="button"
              onClick={() => setEmojis((prev) => prev.filter((e) => e !== emoji))}
              aria-label={`Remove ${emoji}`}
              className="rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {emojis.length === 0 && (
          <p className="text-xs text-red-600 dark:text-red-400">
            Keep at least one, or the control disappears from every message.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Paste an emoji"
          maxLength={16}
          disabled={full || isSaving}
          className="w-40 text-base"
        />
        <Button
          variant="outline"
          size="icon"
          onClick={add}
          disabled={!draft.trim() || full || isSaving}
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add reaction</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEmojis(DEFAULT_REACTION_EMOJIS)}
          disabled={isSaving}
          className="text-xs"
        >
          <RotateCcw className="mr-1.5 h-3 w-3" />
          Reset to default
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!dirty || isSaving || emojis.length === 0}>
          {isSaving ? 'Saving...' : 'Save reactions'}
        </Button>
        {dirty && !isSaving && <span className="text-xs text-zinc-500">Unsaved changes</span>}
      </div>
    </div>
  )
}
