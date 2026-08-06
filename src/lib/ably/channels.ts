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
 * Collaboration on a single project: tasks, and anything else the collaboration
 * page renders from the server.
 *
 * Per project rather than per business, because project access is membership
 * scoped (see modules/projects/authz) — unlike the pipeline channel, an org-wide
 * one would tell every member which projects are being worked on.
 *
 * The project id is the LAST segment so that a token can grant every project in
 * a business with the single trailing wildcard below. With the id in the middle
 * there was no wildcard that covered it, so an admin's token had to enumerate
 * every project in the business — one row per project in the capability, and a
 * findMany over the whole table on every auth call.
 */
export function projectCollabChannel(businessId: string, projectId: string) {
  return `business:${businessId}:collab:${projectId}`
}

/**
 * Every project's collaboration channel in a business, for tokens that should
 * see all of them. Only org admins qualify — a member's token still lists the
 * projects they are actually on, which is a short list.
 */
export function allProjectCollabChannels(businessId: string) {
  return `business:${businessId}:collab:*`
}

/** Event names published on a project's collaboration channel. */
export const COLLAB_EVENT = {
  refresh: 'collab-refresh',
  comment: 'collab-comment',
} as const

/** Every collaboration payload names its actor, so a client can skip its own echo. */
type CollabActor = {
  actorUserId: string
}

/**
 * Something server-rendered changed — tasks, members.
 *
 * Deliberately carries no data. The client responds by refreshing the route,
 * which re-runs the server component and re-authorizes, so nothing is trusted
 * off the channel and a subscriber whose access was revoked cannot be shown
 * what they may no longer read. Costs one function invocation per viewer, which
 * is why it is used for the things that change rarely.
 */
export type CollabRefreshPayload = CollabActor

/**
 * A posted, edited or deleted comment, carried in full.
 *
 * Unlike `refresh` this IS trusted off the channel — the trade that buys a busy
 * thread zero function invocations for its readers. Two things make it
 * acceptable: subscribe is granted only for projects the reader can already
 * see, and a deleted comment arrives already blanked by the server rather than
 * trusting the client to hide it.
 *
 * The residual gap is token lifetime: someone removed from a project keeps
 * receiving until their Ably token renews. Anything that must revoke promptly
 * belongs on `refresh` instead.
 */
export type CollabCommentPayload = CollabActor & {
  /**
   * Who acted, by name. Usually the author, but a delete can be an admin
   * moderating someone else's comment — and the activity line has to say who
   * actually did it, which `comment.author` would get wrong.
   */
  actorName: string | null
  /** Shaped as one node from getComments, flat — the client rebuilds the tree. */
  comment: {
    id: string
    parentId: string | null
    body: string
    authorId: string | null
    author: {
      id: string
      firstName: string | null
      lastName: string | null
      email: string
      imageUrl: string | null
    } | null
    /** Serialized over the wire, so a string on arrival. */
    createdAt: string | Date
    editedAt: string | Date | null
    isDeleted: boolean
  }
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
