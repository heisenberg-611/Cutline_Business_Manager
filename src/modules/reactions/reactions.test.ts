import { describe, it, expect } from 'vitest'
import {
  DEFAULT_REACTION_EMOJIS,
  MAX_REACTION_EMOJIS,
  emojiSetOf,
  groupReactions,
  isReactionTarget,
  normalizeEmojiSet,
} from './reactions'

const ORDER = ['👍', '✅', '🎉']

function row(targetId: string, emoji: string, userId: string) {
  return { targetId, emoji, userId }
}

describe('groupReactions', () => {
  it('counts each emoji separately on the same target', () => {
    const groups = groupReactions(
      [row('m1', '👍', 'u1'), row('m1', '👍', 'u2'), row('m1', '🎉', 'u3')],
      null,
      ORDER
    )
    expect(groups.get('m1')).toEqual([
      { emoji: '👍', count: 2, reacted: false },
      { emoji: '🎉', count: 1, reacted: false },
    ])
  })

  it('keeps targets apart', () => {
    const groups = groupReactions([row('m1', '👍', 'u1'), row('m2', '👍', 'u1')], null, ORDER)
    expect(groups.get('m1')?.[0].count).toBe(1)
    expect(groups.get('m2')?.[0].count).toBe(1)
  })

  // The pill renders differently when you are one of the people in it.
  it('marks the viewer own reaction', () => {
    const groups = groupReactions([row('m1', '👍', 'u1'), row('m1', '👍', 'me')], 'me', ORDER)
    expect(groups.get('m1')?.[0]).toEqual({ emoji: '👍', count: 2, reacted: true })
  })

  it('does not mark it when the viewer only shares the target', () => {
    const groups = groupReactions([row('m1', '👍', 'u1'), row('m1', '🎉', 'me')], 'me', ORDER)
    const thumbs = groups.get('m1')?.find((g) => g.emoji === '👍')
    expect(thumbs?.reacted).toBe(false)
  })

  /**
   * Ordered by the workspace's set, so the bar reads the same on every message
   * rather than by whichever reaction happened to land first.
   */
  it('orders by the configured set, not by arrival', () => {
    const groups = groupReactions(
      [row('m1', '🎉', 'u1'), row('m1', '👍', 'u2'), row('m1', '✅', 'u3')],
      null,
      ORDER
    )
    expect(groups.get('m1')?.map((g) => g.emoji)).toEqual(['👍', '✅', '🎉'])
  })

  // An admin dropping an emoji must not erase reactions people already gave.
  it('keeps an emoji no longer in the set, sorted last', () => {
    const groups = groupReactions(
      [row('m1', '🙈', 'u1'), row('m1', '👍', 'u2')],
      null,
      ORDER
    )
    expect(groups.get('m1')?.map((g) => g.emoji)).toEqual(['👍', '🙈'])
  })

  it('returns nothing for a target with no reactions', () => {
    expect(groupReactions([], null, ORDER).get('m1')).toBeUndefined()
  })
})

describe('normalizeEmojiSet', () => {
  it('trims and drops blanks', () => {
    expect(normalizeEmojiSet([' 👍 ', '', '   ', '🎉'])).toEqual(['👍', '🎉'])
  })

  it('de-duplicates', () => {
    expect(normalizeEmojiSet(['👍', '👍', '✅'])).toEqual(['👍', '✅'])
  })

  it('caps the set', () => {
    const many = Array.from({ length: 40 }, (_, i) => `e${i}`)
    expect(normalizeEmojiSet(many)).toHaveLength(MAX_REACTION_EMOJIS)
  })

  // The emoji column is free text; without a length bound a whole sentence
  // could be saved as a "reaction" and would render as one.
  it('rejects anything long enough to be a message', () => {
    expect(normalizeEmojiSet(['👍', 'this is not an emoji at all'])).toEqual(['👍'])
  })

  it('returns null when nothing usable survives', () => {
    expect(normalizeEmojiSet(['', '   '])).toBeNull()
    expect(normalizeEmojiSet([])).toBeNull()
    expect(normalizeEmojiSet('not an array')).toBeNull()
  })
})

describe('emojiSetOf', () => {
  it('uses what the business configured', () => {
    expect(emojiSetOf({ reactionEmojis: ['🔥'] })).toEqual(['🔥'])
  })

  // A bar with no emoji is a dead control, so an empty column falls back.
  it('falls back when the column is empty or missing', () => {
    expect(emojiSetOf({ reactionEmojis: [] })).toEqual(DEFAULT_REACTION_EMOJIS)
    expect(emojiSetOf(null)).toEqual(DEFAULT_REACTION_EMOJIS)
  })
})

describe('isReactionTarget', () => {
  it('accepts only the two surfaces that have reactions', () => {
    expect(isReactionTarget('Message')).toBe(true)
    expect(isReactionTarget('Comment')).toBe(true)
    expect(isReactionTarget('Invoice')).toBe(false)
    expect(isReactionTarget('')).toBe(false)
  })
})
