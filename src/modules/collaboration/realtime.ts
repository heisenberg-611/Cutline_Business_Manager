import * as Ably from 'ably'
import {
  projectCollabChannel,
  COLLAB_EVENT,
  type CollabRefreshPayload,
  type CollabCommentPayload,
  type CollabTasksPayload,
  type CollabMembersPayload,
} from '@/lib/ably/channels'
import type { FlatComment } from './comment-tree'
import type { ActivityEntry } from './actions/activity'

/**
 * Publishing to a project's collaboration channel.
 *
 * revalidatePath rebuilds the cache and refreshes the router of whoever called
 * the action — it cannot reach anyone else's browser. These are what reach the
 * other people looking at the same project.
 *
 * Every publish is best-effort: realtime failing must not fail a write that has
 * already committed. Viewers still catch up on their next navigation.
 */
async function publish(
  orgId: string,
  projectId: string,
  event: string,
  payload:
    | CollabRefreshPayload
    | CollabCommentPayload
    | CollabTasksPayload
    | CollabMembersPayload
) {
  if (!process.env.ABLY_API_KEY) return

  try {
    const ably = new Ably.Rest(process.env.ABLY_API_KEY)
    await ably.channels.get(projectCollabChannel(orgId, projectId)).publish(event, payload)
  } catch (e) {
    console.error('Ably collaboration publish error:', e)
  }
}

/** Nudge other viewers to refetch. For the things that change rarely. */
export async function publishCollabRefresh(
  orgId: string,
  projectId: string,
  actorUserId: string
) {
  await publish(orgId, projectId, COLLAB_EVENT.refresh, { actorUserId })
}

/**
 * Send the comment itself, so readers apply it without a round trip.
 *
 * Worth the different treatment because a discussion is the one part of this
 * page that is genuinely chatty — a refresh per message per reader is the cost
 * model the messaging module already moved away from.
 */
export async function publishCollabComment(
  orgId: string,
  projectId: string,
  actorUserId: string,
  actorName: string | null,
  comment: FlatComment
) {
  await publish(orgId, projectId, COLLAB_EVENT.comment, {
    actorUserId,
    actorName,
    comment,
  } satisfies CollabCommentPayload)
}

/**
 * Send the task list itself, so readers apply it without a round trip.
 *
 * The whole list, not a delta — see CollabTasksPayload for why. `activity` is
 * the audit row the mutation just wrote, so the feed stays live without the
 * refresh this event exists to avoid.
 */
export async function publishCollabTasks(
  orgId: string,
  projectId: string,
  actorUserId: string,
  /** Taken from the caller so the actor's own copy carries the same stamp. */
  at: number,
  tasks: unknown[],
  activity: ActivityEntry | null
) {
  await publish(orgId, projectId, COLLAB_EVENT.tasks, {
    actorUserId,
    at,
    tasks,
    activity,
  } satisfies CollabTasksPayload)
}

/**
 * Send the member list itself, so the panel repaints without a route render.
 *
 * `memberIds` rides alongside so the one client that must do more than repaint
 * — the person just removed — can recognise itself without parsing the rows.
 */
export async function publishCollabMembers(
  orgId: string,
  projectId: string,
  actorUserId: string,
  at: number,
  members: { userId: string }[]
) {
  await publish(orgId, projectId, COLLAB_EVENT.members, {
    actorUserId,
    at,
    members,
    memberIds: members.map((m) => m.userId),
  } satisfies CollabMembersPayload)
}
