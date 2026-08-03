'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Eye, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { MentionInput, displayNameOf } from './MentionInput'
import { CommentItem } from './CommentItem'
import { createComment, type CommentAuthor, type CommentNode } from '../actions/comments'
import { EMPTY_DRAFT, encodeDraft, type MentionDraft } from '../mentions'

export function CommentThread({
  entityType,
  entityId,
  comments,
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
        await createComment({ entityType, entityId, body: encoded, parentId })
        reset()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to post comment')
      }
    })
  }

  const totalCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
        <MessageSquare className="h-4 w-4 text-zinc-500" />
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Discussion</h3>
        {totalCount > 0 && (
          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            {totalCount}
          </span>
        )}
      </div>

      <div className="space-y-5 p-4">
        {comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            No comments yet. Start the discussion — type @ to mention a teammate.
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                members={members}
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
                <div className="ml-11 mt-3 space-y-2">
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
          ))
        )}
      </div>

      <div className="border-t border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/50">
        {!canComment ? (
          // Watchers get told why the box is missing rather than being handed a
          // composer that fails on submit. The server still refuses the write.
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Eye className="h-4 w-4 shrink-0" />
            You have watcher access to this project, so you can follow the discussion
            but not post to it. Ask an owner or an admin to upgrade you.
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">⌘↵ to post</span>
            <Button
              size="sm"
              disabled={isPending || !body.text.trim()}
              onClick={() => submit(body, null, () => setBody(EMPTY_DRAFT))}
            >
              {isPending ? 'Posting...' : 'Comment'}
            </Button>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
