/**
 * Reactions, shared by the two places that have them.
 *
 * A plain module, not 'use server'. Both the messaging thread and the project
 * discussion read reactions on their own list queries, and the toggle action
 * validates against the same rules — so the shape and the grouping live once.
 */

/** The two things that can be reacted to. Anything else is rejected. */
export const REACTION_TARGETS = ['Message', 'Comment'] as const
export type ReactionTarget = (typeof REACTION_TARGETS)[number]

export function isReactionTarget(value: string): value is ReactionTarget {
  return (REACTION_TARGETS as readonly string[]).includes(value)
}

/**
 * The set a business starts with, and what it falls back to if the column is
 * somehow empty — a reaction bar with no emoji in it is a dead control.
 *
 * Chosen for work: acknowledge, done, celebrate, seen, appreciate, thanks.
 */
export const DEFAULT_REACTION_EMOJIS = ['👍', '✅', '🎉', '👀', '❤️', '🙏']

/** Keeps one organisation's set to something a row of buttons can hold. */
export const MAX_REACTION_EMOJIS = 12

/** One emoji on one target, with how many people chose it. */
export type ReactionGroup = {
  emoji: string
  count: number
  /** Whether the person reading it is one of them. */
  reacted: boolean
}

export type ReactionRow = {
  targetId: string
  emoji: string
  userId: string
}

/**
 * Turns flat reaction rows into per-target groups.
 *
 * Done here rather than with a grouped query because the viewer's own
 * participation is needed alongside the count, and `groupBy` cannot return both
 * without a second round trip. One findMany over a page of targets covers it.
 *
 * Ordered by the business's configured set, so the bar reads the same on every
 * message regardless of which reaction happened to arrive first. Anything no
 * longer in the set sorts last rather than disappearing — the reaction was
 * still cast, and dropping it would silently rewrite history when an admin
 * edits the list.
 */
export function groupReactions(
  rows: ReactionRow[],
  viewerId: string | null,
  emojiOrder: string[]
): Map<string, ReactionGroup[]> {
  const byTarget = new Map<string, Map<string, ReactionGroup>>()

  for (const row of rows) {
    let groups = byTarget.get(row.targetId)
    if (!groups) {
      groups = new Map()
      byTarget.set(row.targetId, groups)
    }

    const existing = groups.get(row.emoji)
    if (existing) {
      existing.count += 1
      existing.reacted ||= row.userId === viewerId
    } else {
      groups.set(row.emoji, {
        emoji: row.emoji,
        count: 1,
        reacted: row.userId === viewerId,
      })
    }
  }

  const rank = new Map(emojiOrder.map((emoji, index) => [emoji, index]))
  const out = new Map<string, ReactionGroup[]>()
  for (const [targetId, groups] of byTarget) {
    out.set(
      targetId,
      [...groups.values()].sort(
        (a, b) =>
          (rank.get(a.emoji) ?? Number.MAX_SAFE_INTEGER) -
          (rank.get(b.emoji) ?? Number.MAX_SAFE_INTEGER)
      )
    )
  }
  return out
}

/**
 * Cleans a set submitted from settings.
 *
 * Trimmed, de-duplicated, emptied entries dropped and capped. Returns null when
 * nothing usable survives, so the caller can reject rather than save a set that
 * would render an empty bar.
 */
export function normalizeEmojiSet(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null

  const seen = new Set<string>()
  for (const raw of input) {
    if (typeof raw !== 'string') continue
    const emoji = raw.trim()
    // Long enough for a flag or a skin-tone modifier, short enough that a
    // sentence cannot be pasted in as a "reaction".
    if (!emoji || emoji.length > 16) continue
    seen.add(emoji)
    if (seen.size >= MAX_REACTION_EMOJIS) break
  }

  return seen.size > 0 ? [...seen] : null
}

/** The set to offer, falling back when a business has somehow been left empty. */
export function emojiSetOf(business: { reactionEmojis?: string[] | null } | null): string[] {
  const configured = business?.reactionEmojis
  return configured && configured.length > 0 ? configured : DEFAULT_REACTION_EMOJIS
}
