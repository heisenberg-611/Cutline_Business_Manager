/**
 * Mention encoding.
 *
 * Mentions are stored structurally as `@[Display Name](userId)` rather than as
 * a bare `@name`. Resolving a bare name at read time is ambiguous (two people
 * called Kai) and breaks when someone is renamed; embedding the id keeps the
 * link stable and makes the notification target unambiguous.
 *
 * Pure functions only — no Prisma, no auth — so this is cheap to unit test.
 */

/** Matches `@[Display Name](user_id)`. Display text may not contain `]`. */
const MENTION_PATTERN = /@\[([^\]\n]+)\]\(([^)\s]+)\)/g

export type ParsedMention = {
  userId: string
  displayName: string
}

/** Every mention in `body`, in order, deduplicated by userId. */
export function parseMentions(body: string): ParsedMention[] {
  const seen = new Set<string>()
  const found: ParsedMention[] = []

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const [, displayName, userId] = match
    if (seen.has(userId)) continue
    seen.add(userId)
    found.push({ displayName, userId })
  }

  return found
}

export type MentionSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; userId: string; displayName: string }

/**
 * Splits a body into renderable segments so the UI can style mentions without
 * using dangerouslySetInnerHTML — the body is user input and is rendered to
 * other people in the org.
 */
export function segmentBody(body: string): MentionSegment[] {
  const segments: MentionSegment[] = []
  let lastIndex = 0

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const start = match.index ?? 0
    if (start > lastIndex) {
      segments.push({ type: 'text', value: body.slice(lastIndex, start) })
    }
    segments.push({ type: 'mention', displayName: match[1], userId: match[2] })
    lastIndex = start + match[0].length
  }

  if (lastIndex < body.length) {
    segments.push({ type: 'text', value: body.slice(lastIndex) })
  }

  return segments
}

/** The token a composer inserts when a user is picked from the @ menu. */
export function encodeMention(userId: string, displayName: string): string {
  // A display name containing brackets would break the pattern on re-parse.
  const safeName = displayName.replace(/[[\]()]/g, '').trim() || 'user'
  return `@[${safeName}](${userId})`
}

/** Human-readable form, used for notification previews and plain-text contexts. */
export function stripMentionMarkup(body: string): string {
  return body.replace(MENTION_PATTERN, (_full, displayName: string) => `@${displayName}`)
}
