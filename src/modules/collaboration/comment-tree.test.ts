import { describe, it, expect } from 'vitest'
import { buildCommentTree, flattenCommentTree, type FlatComment } from './comment-tree'

function comment(id: string, parentId: string | null, minutes: number): FlatComment {
  return {
    id,
    parentId,
    body: id,
    authorId: 'user_1',
    author: null,
    createdAt: new Date(2026, 0, 1, 0, minutes),
    editedAt: null,
    isDeleted: false,
  }
}

describe('buildCommentTree', () => {
  it('nests replies under their parent', () => {
    const tree = buildCommentTree([
      comment('a', null, 0),
      comment('b', 'a', 1),
      comment('c', null, 2),
    ])
    expect(tree.map((n) => n.id)).toEqual(['a', 'c'])
    expect(tree[0].replies.map((n) => n.id)).toEqual(['b'])
  })

  // Rows arrive in whatever order the wire delivers them, so the builder cannot
  // lean on the caller having sorted first.
  it('orders by createdAt regardless of input order', () => {
    const tree = buildCommentTree([
      comment('c', null, 2),
      comment('a', null, 0),
      comment('b', null, 1),
    ])
    expect(tree.map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })

  it('orders replies within a thread too', () => {
    const tree = buildCommentTree([
      comment('a', null, 0),
      comment('later', 'a', 5),
      comment('sooner', 'a', 1),
    ])
    expect(tree[0].replies.map((n) => n.id)).toEqual(['sooner', 'later'])
  })

  /**
   * A reply can reach the pane before its parent — the realtime payload carries
   * one comment at a time. Showing it at the wrong indent beats dropping what
   * someone just said.
   */
  it('keeps a reply whose parent is missing, as a root', () => {
    const tree = buildCommentTree([comment('orphan', 'gone', 1)])
    expect(tree.map((n) => n.id)).toEqual(['orphan'])
  })

  it('does not mutate the array it was given', () => {
    const rows = [comment('b', null, 1), comment('a', null, 0)]
    buildCommentTree(rows)
    expect(rows.map((r) => r.id)).toEqual(['b', 'a'])
  })

  // The pane merges wire comments over server ones by flattening, patching and
  // rebuilding, so the round trip has to be lossless.
  it('round-trips through flatten', () => {
    const rows = [comment('a', null, 0), comment('b', 'a', 1), comment('c', null, 2)]
    const flat = flattenCommentTree(buildCommentTree(rows))
    expect(flat.map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
    expect(flat.find((r) => r.id === 'b')?.parentId).toBe('a')
  })
})
