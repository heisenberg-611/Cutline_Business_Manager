import React, { useState } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { Loader2 } from 'lucide-react'
import { MessageItem } from './MessageItem'

export interface MessageListProps {
  messages: any[]
  currentUserId: string | null
  conversation: any
  isAdmin: boolean
  virtuosoRef: React.Ref<VirtuosoHandle>
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  onDeleteMessage: (msgId: string) => void
  /** What this workspace offers; empty hides the control. */
  reactionEmojis?: string[]
}

type ThreadMessage = MessageListProps['messages'][number]

// Virtuoso needs firstItemIndex to *decrease* as older messages are prepended,
// otherwise index 0 silently points at a different message and the viewport
// jumps by a page. Start high so there is room to count down.
const START_INDEX = 1_000_000

// Frozen: anchoring to the last item with align 'end' lands on the real bottom
// in one shot. Anchoring to `messages.length - 1` put that message at the *top*
// of the viewport, so Virtuoso had to correct itself once the items below were
// measured — and a meme measures late, which is what the correction rode on.
const INITIAL_ITEM = { index: 'LAST' as const, align: 'end' as const }

// Stick to the bottom only when the reader is already there, and jump instantly.
// A smooth animation that restarts every time a video or image finishes
// measuring is exactly what reads as jitter.
const followOutput = (isAtBottom: boolean) => (isAtBottom ? ('auto' as const) : false)

// Keyed by message id, not by list index: prepending an older page shifts every
// index, and index keys would remount every row — reloading every meme already
// on screen.
const computeItemKey = (index: number, msg: ThreadMessage) => msg?.id ?? index

type ListContext = Pick<
  MessageListProps,
  | 'currentUserId'
  | 'conversation'
  | 'isAdmin'
  | 'hasNextPage'
  | 'isFetchingNextPage'
  | 'onDeleteMessage'
  | 'reactionEmojis'
>

// Both of these live at module scope on purpose. As inline arrows they were a
// brand new component type on every render, so React tore the header down and
// rebuilt it each time and Virtuoso compensated for what it saw as a resize at
// the top of the list.
const ListHeader = ({ context }: { context?: ListContext }) => {
  if (!context?.hasNextPage) return null
  // Constant height whether or not the spinner shows, so starting and finishing
  // a page fetch never shifts the messages below it.
  return (
    <div className="h-12 flex items-center justify-center">
      {context.isFetchingNextPage ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : null}
    </div>
  )
}

const listComponents = { Header: ListHeader }

const itemContent = (_index: number, msg: ThreadMessage, context: ListContext) => (
  <MessageItem
    msg={msg}
    currentUserId={context.currentUserId}
    conversation={context.conversation}
    isAdmin={context.isAdmin}
    reactionEmojis={context.reactionEmojis}
    onDeleteMessage={context.onDeleteMessage}
  />
)

export function MessageList({
  messages,
  currentUserId,
  conversation,
  isAdmin,
  virtuosoRef,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onDeleteMessage,
  reactionEmojis
}: MessageListProps) {
  // Older pages arrive at the head of the array. Anchoring to whichever message
  // was first when this thread opened lets firstItemIndex be derived purely:
  // however far the anchor has been pushed down is exactly how many messages
  // were prepended, so Virtuoso holds the reader on the message they were
  // looking at instead of jumping a page. A missing anchor (empty thread on
  // mount, or the anchor since deleted) falls back to the base index, which is
  // correct for appends — the only thing an empty thread can receive.
  const [anchorId] = useState<string | null>(() => (messages.length > 0 ? messages[0].id : null))
  const anchorIndex = anchorId === null ? 0 : messages.findIndex((m: ThreadMessage) => m.id === anchorId)

  const context: ListContext = {
    currentUserId,
    conversation,
    isAdmin,
    hasNextPage,
    isFetchingNextPage,
    onDeleteMessage,
    reactionEmojis
  }

  return (
    <div className="flex-1 overflow-hidden relative bg-muted/10">
      <Virtuoso
        // Switching threads must start from a clean scroll state, not inherit
        // the previous thread's position and index window.
        key={conversation?.id}
        ref={virtuosoRef}
        data={messages}
        context={context}
        initialTopMostItemIndex={INITIAL_ITEM}
        firstItemIndex={START_INDEX - Math.max(anchorIndex, 0)}
        computeItemKey={computeItemKey}
        followOutput={followOutput}
        increaseViewportBy={{ top: 300, bottom: 300 }}
        startReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        }}
        className="h-full scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-400 dark:hover:scrollbar-thumb-zinc-600"
        components={listComponents}
        itemContent={itemContent}
      />
    </div>
  )
}
