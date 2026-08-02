import { describe, it, expect } from 'vitest'
import { parseMentions, segmentBody, encodeMention, stripMentionMarkup } from './mentions'

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
