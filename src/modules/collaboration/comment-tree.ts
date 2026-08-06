/**
 * Assembling flat comment rows into threads.
 *
 * Lives outside actions/comments.ts because both sides need it now: the server
 * builds the initial tree, and the discussion pane rebuilds it when a comment
 * arrives over the wire. A second copy on the client would be free to drift
 * from the ordering and orphan handling the server uses.
 *
 * A plain module, not 'use server' — that directive restricts a file to async
 * exports, and this is neither async nor a server action.
 */

export type CommentAuthor = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  imageUrl: string | null
}

/** One comment, without its replies attached. */
export type FlatComment = {
  /** Grouped counts, attached by the reader that loaded the thread. */
  reactions?: import('../reactions/reactions').ReactionGroup[]
  id: string
  parentId: string | null
  body: string
  authorId: string | null
  author: CommentAuthor | null
  createdAt: Date
  editedAt: Date | null
  isDeleted: boolean
}

export type CommentNode = FlatComment & {
  replies: CommentNode[]
}

/**
 * Threads from flat rows, oldest first at both levels.
 *
 * The discussion is two levels deep by design — createComment reparents a reply
 * to a reply onto its grandparent — so a node whose parent is missing is
 * treated as a root rather than dropped. Losing a comment because its parent
 * has not arrived yet would be worse than showing it at the wrong indent.
 */
export function buildCommentTree(rows: FlatComment[]): CommentNode[] {
  const ordered = [...rows].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const byId = new Map<string, CommentNode>()
  for (const row of ordered) {
    byId.set(row.id, { ...row, replies: [] })
  }

  const roots: CommentNode[] = []
  for (const row of ordered) {
    const node = byId.get(row.id)!
    const parent = row.parentId ? byId.get(row.parentId) : null
    if (parent) parent.replies.push(node)
    else roots.push(node)
  }

  return roots
}

/** The inverse — every node in a tree, flat again. */
export function flattenCommentTree(nodes: CommentNode[]): FlatComment[] {
  const out: FlatComment[] = []
  const walk = (list: CommentNode[]) => {
    for (const { replies, ...rest } of list) {
      out.push(rest)
      walk(replies)
    }
  }
  walk(nodes)
  return out
}
