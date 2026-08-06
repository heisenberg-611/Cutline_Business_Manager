'use client'

import { useConversationMessages, useConversations } from '../hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Ghost, Send, Megaphone, Loader2, Users, MessageSquare, Bell, BellOff, Trash2, RefreshCcw, SmilePlus, ChevronLeft, Timer, Check, Shield, Copy } from 'lucide-react'
import { toggleMuteConversation, deleteConversation, deleteMessage } from '../actions'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import React from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { useMessagingConfig } from './QueryProvider'
import { MessageItem } from './thread/MessageItem'
import { MessageComposer } from './thread/MessageComposer'
import { ThreadHeader } from './thread/ThreadHeader'
import { useThreadScroll } from './thread/useThreadScroll'
import { MessageList } from './thread/MessageList'
import { useReactionEmojis } from '@/modules/reactions/useReactionEmojis'



export function ThreadView({ conversationId, currentUserId, isAdmin }: { conversationId: string, currentUserId: string, isAdmin: boolean }) {
  const { messages, isLoading, sendMessage, isSending, markAsRead, refetch, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage, updateSlowMode, isUpdatingSlowMode } = useConversationMessages(conversationId, currentUserId)
  const { data: conversations } = useConversations()
  const queryClient = useQueryClient()
  const { realtimeEnabled } = useMessagingConfig()
  const { virtuosoRef, scrollToBottom } = useThreadScroll()
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  // Loaded once for the whole thread rather than per message.
  const reactionEmojis = useReactionEmojis()

  const conversation = conversations?.find(c => c.id === conversationId)
  const isBroadcast = conversation?.type === 'BROADCAST'
  const isGroup = conversation?.type === 'GROUP'

  // Optimistic ids are excluded: a sent message changes id from temp-* to the
  // real one, which otherwise fired mark-read (and the conversations refetch
  // behind it) twice per message.
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null
  const latestMessageId = latestMessage && !latestMessage.isOptimistic ? latestMessage.id : null

  // Mark read on load and when new messages arrive
  useEffect(() => {
    if (latestMessageId) {
      markAsRead()
    }
  }, [latestMessageId, markAsRead])

  // Slow Mode Cooldown Logic
  useEffect(() => {
    if (!conversation?.slowModeEnabled || isAdmin || !isGroup) {
      setCooldownRemaining(0)
      return
    }

    // Find my most recent REAL message (ignore optimistic temp IDs for accurate cooldown)
    const myLastMessage = [...messages].reverse().find((m: any) => m.senderId === currentUserId && !m.isOptimistic)
    if (!myLastMessage) {
      setCooldownRemaining(0)
      return
    }

    const updateCooldown = () => {
      const timeSince = (Date.now() - new Date(myLastMessage.createdAt).getTime()) / 1000
      const remaining = Math.ceil(conversation.slowModeCooldown - timeSince)
      setCooldownRemaining(Math.max(0, remaining))
    }

    updateCooldown()
    const int = setInterval(updateCooldown, 1000)
    return () => clearInterval(int)
  }, [messages, conversation?.slowModeEnabled, conversation?.slowModeCooldown, isAdmin, currentUserId, conversation?.type])





  const handleDeleteMessage = useCallback(async (msgId: string) => {
    const confirmed = confirm('Are you sure you want to permanently delete this message?')
    if (!confirmed) return

    // Optimistically remove from UI
    queryClient.setQueryData(['messages', conversationId], (old: any) => {
      if (!old || !old.pages) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.filter((m: any) => m.id !== msgId)
        }))
      }
    })

    try {
      await deleteMessage(msgId)
    } catch (e: any) {
      alert(e.message || 'Failed to delete message')
      // On failure, clear cache and force full refetch to restore correct state
      queryClient.setQueryData(['messages', conversationId], undefined)
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    }
  }, [conversationId, queryClient])

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  if (!conversation) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Conversation not found.</div>
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      <ThreadHeader
        conversation={conversation}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        isUpdatingSlowMode={isUpdatingSlowMode}
        updateSlowMode={updateSlowMode}
      />
      


      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        conversation={conversation}
        isAdmin={isAdmin}
        virtuosoRef={virtuosoRef}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        onDeleteMessage={handleDeleteMessage}
        reactionEmojis={reactionEmojis}
      />

      <MessageComposer
        onSend={sendMessage}
        isSending={isSending}
        cooldownRemaining={cooldownRemaining}
        isBroadcast={isBroadcast}
        isAdmin={isAdmin}
        scrollToBottom={scrollToBottom}
      />
    </div>
  )
}
