import { describe, it, expect } from 'vitest'
import {
  parseMentions,
  segmentBody,
  encodeMention,
  stripMentionMarkup,
  draftFromBody,
  encodeDraft,
} from './mentions'

describe('parseMentions', () => {
  it('returns nothing for a body with no mentions', () => {
    expect(parseMentions('Just a normal comment.')).toEqual([])
  })

  it('extracts a single mention', () => {
    expect(parseMentions('Hey @[Kai Osei](user_1) look at this')).toEqual([
      { userId: 'user_1', displayName: 'Kai Osei' },
    ])
  })

  it('extracts several mentions in order', () => {
    const result = parseMentions('@[Ada](user_1) and @[Juno](user_2) please review')
    expect(result.map((m) => m.userId)).toEqual(['user_1', 'user_2'])
  })

  it('deduplicates repeated mentions of the same user', () => {
    const result = parseMentions('@[Ada](user_1) ... @[Ada](user_1) again')
    expect(result).toHaveLength(1)
  })

  // A bare @handle is ambiguous and must not resolve to anyone.
  it('ignores plain @handles', () => {
    expect(parseMentions('email me @kai or @juno')).toEqual([])
  })

  it('ignores an email address', () => {
    expect(parseMentions('reach me at kai@example.com')).toEqual([])
  })

  it('ignores a malformed token with no user id', () => {
    expect(parseMentions('@[Kai Osei]() hello')).toEqual([])
  })

  it('does not span newlines inside the display name', () => {
    expect(parseMentions('@[Kai\nOsei](user_1)')).toEqual([])
  })
})

describe('segmentBody', () => {
  it('splits text and mentions in order', () => {
    expect(segmentBody('Hi @[Kai](user_1), thanks')).toEqual([
      { type: 'text', value: 'Hi ' },
      { type: 'mention', userId: 'user_1', displayName: 'Kai' },
      { type: 'text', value: ', thanks' },
    ])
  })

  it('handles a body that is only a mention', () => {
    expect(segmentBody('@[Kai](user_1)')).toEqual([
      { type: 'mention', userId: 'user_1', displayName: 'Kai' },
    ])
  })

  it('handles adjacent mentions', () => {
    const segments = segmentBody('@[A](u1)@[B](u2)')
    expect(segments).toHaveLength(2)
    expect(segments.every((s) => s.type === 'mention')).toBe(true)
  })

  // The renderer maps segments to React nodes; markup surviving as text here is
  // what keeps it out of the DOM as HTML.
  it('leaves injected markup as plain text', () => {
    const segments = segmentBody('<script>alert(1)</script> @[Kai](user_1)')
    expect(segments[0]).toEqual({ type: 'text', value: '<script>alert(1)</script> ' })
  })

  it('round-trips an encoded mention', () => {
    const token = encodeMention('user_9', 'Juno Park')
    expect(parseMentions(`hello ${token}`)).toEqual([
      { userId: 'user_9', displayName: 'Juno Park' },
    ])
  })
})

describe('encodeMention', () => {
  // Brackets in a display name would otherwise terminate the token early and
  // corrupt every mention after it.
  it('strips characters that would break the pattern', () => {
    const token = encodeMention('user_1', 'Kai [Contractor] (freelance)')
    expect(token).toBe('@[Kai Contractor freelance](user_1)')
    expect(parseMentions(token)).toEqual([
      { userId: 'user_1', displayName: 'Kai Contractor freelance' },
    ])
  })

  it('falls back when the display name is empty after stripping', () => {
    expect(encodeMention('user_1', '[]')).toBe('@[user](user_1)')
  })
})

describe('stripMentionMarkup', () => {
  it('reduces mentions to readable handles', () => {
    expect(stripMentionMarkup('cc @[Kai Osei](user_1) and @[Ada](user_2)')).toBe(
      'cc @Kai Osei and @Ada'
    )
  })

  it('leaves a body without mentions untouched', () => {
    expect(stripMentionMarkup('nothing here')).toBe('nothing here')
  })
})

describe('draft round-trip', () => {
  it('hides the id from the editable text', () => {
    const draft = draftFromBody('Hi @[Kai Osei](user_1), look at this')
    expect(draft.text).toBe('Hi @Kai Osei, look at this')
    expect(draft.text).not.toContain('user_1')
    expect(draft.mentions).toEqual({ 'Kai Osei': 'user_1' })
  })

  it('re-attaches the id on encode', () => {
    const body = 'Hi @[Kai Osei](user_1), look at this'
    expect(encodeDraft(draftFromBody(body))).toBe(body)
  })

  it('survives editing text around a mention', () => {
    const draft = draftFromBody('@[Kai Osei](user_1) please review')
    const edited = { ...draft, text: '@Kai Osei please review today' }
    expect(parseMentions(encodeDraft(edited))).toEqual([
      { userId: 'user_1', displayName: 'Kai Osei' },
    ])
  })

  // Deleting the name from the text has to drop the mention, or someone stays
  // notified about a comment that no longer names them.
  it('drops a mention removed from the text', () => {
    const draft = draftFromBody('@[Kai Osei](user_1) hello')
    const edited = { ...draft, text: 'hello' }
    expect(parseMentions(encodeDraft(edited))).toEqual([])
  })

  // Matching the shorter name first would leave " Osei" stranded outside the
  // token and mention the wrong person.
  it('prefers the longer name when one is a prefix of another', () => {
    const draft = {
      text: '@Kai Osei and @Kai',
      mentions: { Kai: 'user_short', 'Kai Osei': 'user_long' },
    }
    expect(parseMentions(encodeDraft(draft)).map((m) => m.userId)).toEqual([
      'user_long',
      'user_short',
    ])
  })

  it('handles a name containing regex metacharacters', () => {
    const draft = { text: '@A. B (x) hello', mentions: { 'A. B (x)': 'user_1' } }
    expect(parseMentions(encodeDraft(draft))).toEqual([
      { userId: 'user_1', displayName: 'A. B x' },
    ])
  })

  it('encodes every occurrence of a repeated mention', () => {
    const draft = { text: '@Kai then @Kai', mentions: { Kai: 'user_1' } }
    expect(encodeDraft(draft)).toBe('@[Kai](user_1) then @[Kai](user_1)')
  })

  it('leaves an unpicked @handle as plain text', () => {
    const draft = { text: 'hey @nobody', mentions: {} }
    expect(encodeDraft(draft)).toBe('hey @nobody')
    expect(parseMentions(encodeDraft(draft))).toEqual([])
  })
})
