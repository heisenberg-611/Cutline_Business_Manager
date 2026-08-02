/**
 * Ably channel naming.
 *
 * Every channel lives under a per-tenant namespace, `business:{businessId}:...`,
 * so a single capability entry can scope a token to one business. Ably matches
 * a trailing `*` across any number of segments (verified against the account),
 * which is what lets `business:{id}:*` cover both the sidebar channel and
 * arbitrarily nested per-conversation channels.
 *
 * Names are defined here rather than inline at each call site so a publisher
 * and a subscriber cannot drift apart — a mismatch fails silently as "realtime
 * just doesn't work", with no error anywhere.
 */

/** Capability pattern granting access to everything owned by one business. */
export function businessNamespace(businessId: string) {
  return `business:${businessId}:*`
}

/** Per-business fan-out: conversation list ordering and unread counts. */
export function sidebarChannel(businessId: string) {
  return `business:${businessId}:sidebar`
}

/** Messages within a single conversation. */
export function conversationChannel(businessId: string, conversationId: string) {
  return `business:${businessId}:conversation:${conversationId}`
}
