import React from 'react'
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
}

export function MessageList({
  messages,
  currentUserId,
  conversation,
  isAdmin,
  virtuosoRef,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onDeleteMessage
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-hidden relative bg-muted/10">
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        initialTopMostItemIndex={messages.length - 1}
        firstItemIndex={0}
        startReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        }}
        className="h-full scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 hover:scrollbar-thumb-zinc-400 dark:hover:scrollbar-thumb-zinc-600"
        components={{
          Header: () => (
            <div className="py-4 text-center">
              {isFetchingNextPage ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /> : null}
            </div>
          )
        }}
        itemContent={(index, msg: any) => (
          <MessageItem
            msg={msg}
            currentUserId={currentUserId}
            conversation={conversation}
            isAdmin={isAdmin}
            onDeleteMessage={onDeleteMessage}
          />
        )}
      />
    </div>
  )
}
