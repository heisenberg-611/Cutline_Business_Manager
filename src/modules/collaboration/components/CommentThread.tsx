'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { MentionInput, displayNameOf } from './MentionInput'
import { CommentItem } from './CommentItem'
import { Panel, PanelEmpty, PANEL_SCROLL_MAIN } from './Panel'
import { createComment, type CommentAuthor, type CommentNode } from '../actions/comments'
import { EMPTY_DRAFT, encodeDraft, type MentionDraft } from '../mentions'
import { buildCommentTree, flattenCommentTree } from '../comment-tree'
import { useCollabRealtimeContext } from './CollabRealtimeProvider'
import { useReactionEmojis } from '@/modules/reactions/useReactionEmojis'

/**
 * How many threads the pane holds before older ones are tucked behind a button.
 * The pane itself scrolls, so this is about not rendering years of history into
 * the DOM on open — not about what fits on screen.
 */
const VISIBLE_THREADS = 20

export function CommentThread({
  entityType,
  entityId,
  comments: serverComments,
  members,
  currentUserId,
  isAdmin,
  canComment,
}: {
  entityType: string
  entityId: string
  comments: CommentNode[]
  members: CommentAuthor[]
  currentUserId: string
  isAdmin: boolean
  /** Write access. Watchers can read the thread but not post to it. */
  canComment: boolean
}) {
  // Comments are the one part of this page that arrives with its payload rather
  // than as a nudge to refetch — a discussion is chatty enough that a refresh
  // per message per reader is the cost the messaging module already moved away
  // from. The server copy stays authoritative: anything it knows about wins, so
  // a reader who has been here an hour converges on what a fresh load shows.
  const { remoteComments, applyComment } = useCollabRealtimeContext()
  // Once for the thread, not once per comment.
  const reactionEmojis = useReactionEmojis()
  const comments = useMemo(() => {
    if (remoteComments.size === 0) return serverComments

    const merged = new Map(flattenCommentTree(serverComments).map((c) => [c.id, c]))
    for (const [id, { comment: incoming }] of remoteComments) {
      const known = merged.get(id)
      // An edit or a delete the server has not caught up with yet still has to
      // land; only a comment the server has never heard of is a plain insert.
      if (!known || (incoming.editedAt?.getTime() ?? 0) >= (known.editedAt?.getTime() ?? 0)) {
        merged.set(id, incoming)
      }
      if (incoming.isDeleted) merged.set(id, incoming)
    }
    return buildCommentTree([...merged.values()])
  }, [serverComments, remoteComments])

  const [body, setBody] = useState<MentionDraft>(EMPTY_DRAFT)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState<MentionDraft>(EMPTY_DRAFT)
  const [isPending, startTransition] = useTransition()

  const replyTarget = replyTo
    ? comments.find((c) => c.id === replyTo) ??
      comments.flatMap((c) => c.replies).find((r) => r.id === replyTo)
    : null

  function submit(draft: MentionDraft, parentId: string | null, reset: () => void) {
    if (!draft.text.trim()) return
    // Names become `@[Name](id)` tokens only here, on the way to the server.
    const encoded = encodeDraft({ ...draft, text: draft.text.trim() })

    startTransition(async () => {
      try {
        // The action returns the stored comment, so the thread settles without
        // re-rendering the route.
        applyComment(await createComment({ entityType, entityId, body: encoded, parentId }))
        reset()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to post comment')
      }
    })
  }

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0)

  // Comments arrive oldest first, so the newest sit at the bottom of the pane —
  // the chat convention. Only the most recent threads render; older ones are one
  // click away rather than gone.
  const [visible, setVisible] = useState(VISIBLE_THREADS)
  const shown = comments.slice(-visible)
  const olderCount = comments.length - shown.length

  const paneRef = useRef<HTMLDivElement>(null)
  // Open pinned to the newest comment, and stay pinned as new ones arrive.
  // Keyed on the count so revealing older threads does not yank the view back
  // down while someone is reading history.
  useEffect(() => {
    const pane = paneRef.current
    if (pane) pane.scrollTop = pane.scrollHeight
  }, [comments.length])

  const composer = !canComment ? (
    // Watchers get told why the box is missing rather than being handed a
    // composer that fails on submit. The server still refuses the write.
    <p className="flex items-center gap-2 text-sm text-zinc-500">
      <Eye className="h-4 w-4 shrink-0" />
      You have watcher access to this project, so you can follow the discussion but not post
      to it. Ask an owner or an admin to upgrade you.
    </p>
  ) : (
    <div className="space-y-2">
      <MentionInput
        draft={body}
        onChange={setBody}
        members={members}
        placeholder="Add a comment. Type @ to mention a teammate."
        disabled={isPending}
        onSubmit={() => submit(body, null, () => setBody(EMPTY_DRAFT))}
      />
      {/* Hint sits beside the button rather than pinned to the far edge, which
          left a wide gap across the footer. */}
      <div className="flex items-center justify-end gap-3">
        {/* Keyboard hint is meaningless on a touch device. */}
        <span className="hidden text-xs text-zinc-400 sm:inline">⌘↵ to post</span>
        {/* Default size, matching the other panel footers' controls. The reply
            and edit buttons inside a thread stay small — they are nested. */}
        <Button
          disabled={isPending || !body.text.trim()}
          onClick={() => submit(body, null, () => setBody(EMPTY_DRAFT))}
        >
          {isPending ? 'Posting...' : 'Comment'}
        </Button>
      </div>
    </div>
  )

  return (
    <Panel icon={MessageSquare} title="Discussion" count={totalCount || undefined} clip={false} footer={composer}>
      {/* Threads are separated by rules rather than whitespace alone, so where
          one conversation ends and the next begins survives a long page.
          The pane scrolls its own history, chat-style; the @ picker is portalled
          so this container cannot clip it. */}
      <div
        ref={paneRef}
        className={`divide-y divide-zinc-100 sm:overflow-y-auto sm:overscroll-contain dark:divide-zinc-800 ${PANEL_SCROLL_MAIN}`}
      >
        {comments.length === 0 ? (
          <PanelEmpty>
            No comments yet. Start the discussion — type @ to mention a teammate.
          </PanelEmpty>
        ) : (
          <>
            {olderCount > 0 && (
              <div className="p-3 text-center sm:p-4">
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + VISIBLE_THREADS)}
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  Show {Math.min(olderCount, VISIBLE_THREADS)} earlier{' '}
                  {olderCount === 1 ? 'comment' : 'comments'}
                </button>
              </div>
            )}
            {shown.map((comment) => (
              <div key={comment.id} className="p-3 sm:p-4">
                <CommentItem
                  comment={comment}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  members={members}
                  reactionEmojis={reactionEmojis}
                  onReply={
                    canComment
                      ? (id) => {
                          setReplyTo(id)
                          setReplyBody(EMPTY_DRAFT)
                        }
                      : undefined
                  }
                />

                {replyTo && (replyTo === comment.id || comment.replies.some((r) => r.id === replyTo)) && (
                  <div className="mt-3 space-y-2 border-l border-zinc-200 pl-4 dark:border-zinc-800 sm:ml-4 sm:pl-5">
                    <MentionInput
                      draft={replyBody}
                      onChange={setReplyBody}
                      members={members}
                      placeholder={
                        replyTarget?.author
                          ? `Reply to ${displayNameOf(replyTarget.author)}...`
                          : 'Write a reply...'
                      }
                      disabled={isPending}
                      rows={2}
                      onSubmit={() =>
                        submit(replyBody, comment.id, () => {
                          setReplyBody(EMPTY_DRAFT)
                          setReplyTo(null)
                        })
                      }
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={isPending || !replyBody.text.trim()}
                        onClick={() =>
                          submit(replyBody, comment.id, () => {
                            setReplyBody(EMPTY_DRAFT)
                            setReplyTo(null)
                          })
                        }
                      >
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyTo(null)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </Panel>
  )
}
