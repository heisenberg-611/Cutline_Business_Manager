import { describe, it, expect } from 'vitest'
import { mergeActivity } from './ActivityFeed'
import type { ActivityEntry } from '../actions/activity'
import type { RemoteCommentEvent } from '../hooks/useCollabRealtime'

const PROJECT = 'proj_1'

function serverEntry(
  id: string,
  minutes: number,
  extra: Partial<ActivityEntry> = {}
): ActivityEntry {
  return {
    id,
    action: 'TASK_CREATED',
    entityType: 'Task',
    entityId: 'task_1',
    actorUserId: 'user_1',
    actorName: 'Ada',
    metadata: {},
    createdAt: new Date(2026, 0, 1, 0, minutes),
    ...extra,
  }
}

function wireComment(
  id: string,
  minutes: number,
  overrides: Partial<RemoteCommentEvent['comment']> = {}
): RemoteCommentEvent {
  return {
    actorUserId: 'user_2',
    actorName: 'Grace',
    comment: {
      id,
      parentId: null,
      body: 'hello',
      authorId: 'user_2',
      author: null,
      createdAt: new Date(2026, 0, 1, 0, minutes),
      editedAt: null,
      isDeleted: false,
      ...overrides,
    },
  }
}

describe('mergeActivity', () => {
  it('orders newest first across both sources', () => {
    const merged = mergeActivity(
      [serverEntry('a', 10)],
      [serverEntry('b', 1)],
      [wireComment('c1', 20)],
      PROJECT
    )
    expect(merged.map((e) => e.id)).toEqual(['local:COMMENT_POSTED:c1', 'a', 'b'])
  })

  // The head is re-rendered by the server on every refresh; an older page
  // fetched earlier can overlap it.
  it('does not duplicate an older entry already in the head', () => {
    const merged = mergeActivity([serverEntry('a', 10)], [serverEntry('a', 10)], [], PROJECT)
    expect(merged.filter((e) => e.id === 'a')).toHaveLength(1)
  })

  /**
   * The point of the synthetic line: a comment arrives with its payload, so the
   * audit row for it is not in the feed yet.
   */
  it('adds a line for a comment the server has not caught up with', () => {
    const merged = mergeActivity([], [], [wireComment('c1', 5)], PROJECT)
    expect(merged).toHaveLength(1)
    expect(merged[0].action).toBe('COMMENT_POSTED')
    expect(merged[0].actorName).toBe('Grace')
  })

  it('drops the synthetic line once the real audit row arrives', () => {
    const real = serverEntry('audit_1', 5, {
      action: 'COMMENT_POSTED',
      metadata: { commentId: 'c1' },
    })
    const merged = mergeActivity([real], [], [wireComment('c1', 5)], PROJECT)
    expect(merged).toHaveLength(1)
    expect(merged[0].id).toBe('audit_1')
  })

  // Posting and later editing the same comment are two separate lines, so the
  // dedupe key has to include the action or the edit would be swallowed.
  it('keeps an edit even when the post is already in the feed', () => {
    const posted = serverEntry('audit_1', 5, {
      action: 'COMMENT_POSTED',
      metadata: { commentId: 'c1' },
    })
    const merged = mergeActivity(
      [posted],
      [],
      [wireComment('c1', 5, { editedAt: new Date(2026, 0, 1, 0, 9) })],
      PROJECT
    )
    expect(merged.map((e) => e.action)).toEqual(['COMMENT_EDITED', 'COMMENT_POSTED'])
  })

  it('reads a blanked comment as a deletion', () => {
    const merged = mergeActivity([], [], [wireComment('c1', 5, { isDeleted: true, body: '' })], PROJECT)
    expect(merged[0].action).toBe('COMMENT_DELETED')
  })

  it('reads a comment with a parent as a reply', () => {
    const merged = mergeActivity([], [], [wireComment('c1', 5, { parentId: 'c0' })], PROJECT)
    expect(merged[0].action).toBe('COMMENT_REPLIED')
  })

  // An edit is timestamped when it happened, not when the comment was written,
  // or it would sort back down into history.
  it('dates an edit by editedAt', () => {
    const merged = mergeActivity(
      [serverEntry('a', 10)],
      [],
      [wireComment('c1', 1, { editedAt: new Date(2026, 0, 1, 0, 30) })],
      PROJECT
    )
    expect(merged[0].id).toBe('local:COMMENT_EDITED:c1')
  })

  it('never emits an id that could collide with an audit row', () => {
    const merged = mergeActivity([], [], [wireComment('c1', 5)], PROJECT)
    expect(merged[0].id.startsWith('local:')).toBe(true)
  })
})
