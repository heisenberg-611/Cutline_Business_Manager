'use client'

import { useState, useTransition } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { segmentBody, draftFromBody, encodeDraft, type MentionDraft } from '../mentions'
import { MentionInput, displayNameOf } from './MentionInput'
import { editComment, deleteComment, type CommentAuthor, type CommentNode } from '../actions/comments'

function CommentBody({ body, currentUserId }: { body: string; currentUserId: string }) {
  // Segmented rather than interpolated into HTML — the body is another user's
  // input being shown to the whole org.
  return (
    <p className="whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-300">
      {segmentBody(body).map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.value}</span>
        ) : (
          <span
            key={i}
            className={`rounded px-1 py-0.5 text-sm font-medium ${
              seg.userId === currentUserId
                ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'
            }`}
          >
            @{seg.displayName}
          </span>
        )
      )}
    </p>
  )
}

function Avatar({ author }: { author: CommentAuthor | null }) {
  if (author?.imageUrl) {
    // Clerk avatar URLs are external and not in next.config images.remotePatterns,
    // so next/image cannot load them without config the rest of the app lacks.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={author.imageUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-[10px] font-semibold uppercase text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {author ? displayNameOf(author).slice(0, 2) : '--'}
    </span>
  )
}

export function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  members,
  onReply,
  isReply = false,
}: {
  comment: CommentNode
  currentUserId: string
  isAdmin: boolean
  members: CommentAuthor[]
  onReply?: (commentId: string) => void
  isReply?: boolean
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<MentionDraft>(() => draftFromBody(comment.body))
  const [isPending, startTransition] = useTransition()

  const canEdit = !comment.isDeleted && comment.authorId === currentUserId
  const canDelete = !comment.isDeleted && (comment.authorId === currentUserId || isAdmin)

  function handleSaveEdit() {
    if (!draft.text.trim()) return
    const encoded = encodeDraft({ ...draft, text: draft.text.trim() })
    startTransition(async () => {
      try {
        await editComment(comment.id, encoded)
        setIsEditing(false)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to edit comment')
      }
    })
  }

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteComment(comment.id)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to delete comment')
      }
    })
  }

  return (
    <div className={isReply ? 'ml-4 mt-3 sm:ml-11' : ''}>
      <div className="flex gap-3">
        <Avatar author={comment.author} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {comment.author ? displayNameOf(comment.author) : 'Unknown user'}
            </span>
            <span className="text-xs text-zinc-400">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.editedAt && !comment.isDeleted && (
              <span className="text-xs text-zinc-400">(edited)</span>
            )}
          </div>

          <div className="mt-1">
            {comment.isDeleted ? (
              <p className="text-sm italic text-zinc-400">This comment was deleted.</p>
            ) : isEditing ? (
              <div className="space-y-2">
                <MentionInput
                  draft={draft}
                  onChange={setDraft}
                  members={members}
                  disabled={isPending}
                  rows={3}
                  onSubmit={handleSaveEdit}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={isPending || !draft.text.trim()}>
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setDraft(draftFromBody(comment.body))
                      setIsEditing(false)
                    }}
                    disabled={isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <CommentBody body={comment.body} currentUserId={currentUserId} />
            )}
          </div>

          {!comment.isDeleted && !isEditing && (
            <div className="mt-1.5 flex items-center gap-3">
              {onReply && (
                <button
                  type="button"
                  onClick={() => onReply(comment.id)}
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  Reply
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-xs font-medium text-zinc-500 transition-colors hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {comment.replies.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          members={members}
          isReply
        />
      ))}
    </div>
  )
}
