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

/**
 * One person's conversation-list updates: ordering and unread counts.
 *
 * Per user, not per business. This previously fanned out on a single
 * `business:{id}:sidebar` channel that every member subscribed to, and the
 * payload carries the message itself — so every direct message in the
 * organization was delivered to everyone in it.
 */
export function userSidebarChannel(userId: string) {
  return `user:${userId}:sidebar`
}

/** Messages within a single conversation. */
export function conversationChannel(businessId: string, conversationId: string) {
  return `business:${businessId}:conversation:${conversationId}`
}

/**
 * Pipeline board: stage moves and reordering, plus presence for who is
 * currently looking at the board.
 */
export function pipelineChannel(businessId: string) {
  return `business:${businessId}:pipeline`
}

/**
 * One person's notification feed.
 *
 * Deliberately outside the `business:{id}:` namespace. The member token grants
 * `business:{orgId}:*`, so a notification channel placed under it would be
 * readable by every other member of the organization — and notifications carry
 * previews of comments on projects the reader may have no access to.
 */
export function userNotificationsChannel(userId: string) {
  return `user:${userId}:notifications`
}

export const NOTIFICATION_EVENT = 'notification'

export type NotificationPayload = {
  /** The client ignores signals for an organization it is not currently in. */
  businessId: string
}

/** Event names published on the pipeline channel. */
export const PIPELINE_EVENT = {
  projectsMoved: 'projects-moved',
} as const

export type ProjectsMovedPayload = {
  /** Who made the change, so a client can ignore the echo of its own move. */
  actorUserId: string
  updates: { id: string; statusStageId: string; orderIndex: number }[]
}
