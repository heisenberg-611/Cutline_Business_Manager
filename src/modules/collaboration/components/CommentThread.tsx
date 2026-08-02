'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { MentionInput, displayNameOf } from './MentionInput'
import { CommentItem } from './CommentItem'
import { createComment, type CommentAuthor, type CommentNode } from '../actions/comments'

export function CommentThread({
  entityType,
  entityId,
  comments,
  members,
  currentUserId,
  isAdmin,
}: {
  entityType: string
  entityId: string
  comments: CommentNode[]
  members: CommentAuthor[]
  currentUserId: string
  isAdmin: boolean
}) {
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [isPending, startTransition] = useTransition()

  const replyTarget = replyTo
    ? comments.find((c) => c.id === replyTo) ??
      comments.flatMap((c) => c.replies).find((r) => r.id === replyTo)
    : null

  function submit(text: string, parentId: string | null, reset: () => void) {
    const trimmed = text.trim()
    if (!trimmed) return

    startTransition(async () => {
      try {
        await createComment({ entityType, entityId, body: trimmed, parentId })
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
                onReply={(id) => {
                  setReplyTo(id)
                  setReplyBody('')
                }}
              />

              {replyTo && (replyTo === comment.id || comment.replies.some((r) => r.id === replyTo)) && (
                <div className="ml-11 mt-3 space-y-2">
                  <MentionInput
                    value={replyBody}
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
                        setReplyBody('')
                        setReplyTo(null)
                      })
                    }
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={isPending || !replyBody.trim()}
                      onClick={() =>
                        submit(replyBody, comment.id, () => {
                          setReplyBody('')
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
        <div className="space-y-2">
          <MentionInput
            value={body}
            onChange={setBody}
            members={members}
            placeholder="Add a comment. Type @ to mention a teammate."
            disabled={isPending}
            onSubmit={() => submit(body, null, () => setBody(''))}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">⌘↵ to post</span>
            <Button
              size="sm"
              disabled={isPending || !body.trim()}
              onClick={() => submit(body, null, () => setBody(''))}
            >
              {isPending ? 'Posting...' : 'Comment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
