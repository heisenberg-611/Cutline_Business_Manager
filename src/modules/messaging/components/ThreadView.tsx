'use client'

import { useConversationMessages, useConversations } from '../hooks'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Megaphone, Loader2, Users, MessageSquare, Bell, BellOff, Trash2 } from 'lucide-react'
import { toggleMuteConversation, deleteConversation, deleteMessage } from '../actions'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import React from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'

function formatMessageContent(text: string) {
  const LINK_REGEX = /(https?:\/\/[^\s]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|((?:\+?[0-9]{1,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
  
  const parts = text.split(LINK_REGEX);
  return parts.map((part, i) => {
    if (!part) return null;
    
    if (/(https?:\/\/[^\s]+)/.test(part)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all">{part}</a>;
    }
    if (/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/.test(part)) {
      return <a key={i} href={`mailto:${part}`} className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all">{part}</a>;
    }
    if (/((?:\+?[0-9]{1,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/.test(part)) {
      return <a key={i} href={`tel:${part.replace(/[^\d+]/g, '')}`} className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all">{part}</a>;
    }
    
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function ThreadView({ conversationId, currentUserId, isAdmin }: { conversationId: string, currentUserId: string, isAdmin: boolean }) {
  const { messages, isLoading, sendMessage, isSending, markAsRead } = useConversationMessages(conversationId)
  const { data: conversations } = useConversations()
  const [content, setContent] = useState('')
  const [isMuting, setIsMuting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isDeletingChat, setIsDeletingChat] = useState(false)

  const conversation = conversations?.find(c => c.id === conversationId)
  const isBroadcast = conversation?.type === 'BROADCAST'
  const isGroup = conversation?.type === 'GROUP'
  
  let headerTitle = 'Direct Message'
  let headerSubtitle = 'Private Conversation'
  
  if (isBroadcast) {
    headerTitle = 'Broadcast Announcement'
    headerSubtitle = 'All Members'
  } else if (isGroup) {
    if (conversation.title) {
      headerTitle = conversation.title
    } else {
      const names = conversation.participants
        ?.filter((p: any) => p.userId !== currentUserId)
        ?.map((p: any) => p.user.firstName || p.user.email?.split('@')[0])
        ?.join(', ')
      headerTitle = names || 'Group Chat'
    }
    headerSubtitle = `${conversation.participants?.length || 0} members`
  }

  // Mark read on load and when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      markAsRead()
    }
  }, [messages, markAsRead])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!content.trim() || isSending) return
    try {
      await sendMessage(content)
      setContent('')
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'An error occurred')
    }
  }

  const handleToggleMute = async () => {
    if (!conversation) return
    setIsMuting(true)
    const currentMute = conversation.myParticipantRecord?.isMuted || false
    try {
      await toggleMuteConversation(conversation.id, !currentMute)
      // Optimistic update for the sidebar conversations data
      queryClient.setQueryData(['conversations'], (old: any) => {
        if (!old) return old
        return old.map((c: any) => 
          c.id === conversation.id 
            ? { ...c, myParticipantRecord: { ...c.myParticipantRecord, isMuted: !currentMute } }
            : c
        )
      })
    } catch (e) {
      alert('Failed to mute conversation')
    } finally {
      setIsMuting(false)
    }
  }

  const handleDeleteChat = async () => {
    if (!conversation) return
    const confirmed = confirm('Are you sure you want to delete this chat? This cannot be undone.')
    if (!confirmed) return
    
    setIsDeletingChat(true)
    try {
      await deleteConversation(conversation.id)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      router.push('/dashboard/messages')
    } catch (e: any) {
      alert(e.message || 'Failed to delete conversation')
      setIsDeletingChat(false)
    }
  }

  const handleDeleteMessage = async (msgId: string) => {
    const confirmed = confirm('Are you sure you want to permanently delete this message?')
    if (!confirmed) return
    
    try {
      await deleteMessage(msgId)
      // Standard invalidation for react-query to trigger a fresh fetch
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
    } catch (e: any) {
      alert(e.message || 'Failed to delete message')
    }
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  if (!conversation) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Conversation not found.</div>
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isBroadcast ? "bg-blue-500/10 text-blue-500" : isGroup ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
          )}>
            {isBroadcast ? <Megaphone className="w-5 h-5" /> : isGroup ? <Users className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold">{headerTitle}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {isGroup ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="hover:underline hover:text-foreground outline-none text-left flex items-center gap-1 cursor-pointer">
                    {headerSubtitle} <Users className="w-3 h-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-auto min-w-[250px] max-w-[400px] max-h-[50vh] overflow-y-auto">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Group Members ({conversation.participants?.length || 0})</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {conversation.participants?.map((p: any) => (
                        <DropdownMenuItem key={p.userId} className="flex flex-col items-start gap-0.5">
                          <span className="font-medium text-sm truncate w-full text-left">{p.user?.firstName || 'Unknown'} {p.user?.lastName || ''} {p.userId === currentUserId && '(You)'}</span>
                          <span className="text-xs text-muted-foreground truncate w-full text-left">{p.user?.email}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span>{headerSubtitle}</span>
              )}
              {conversation.myParticipantRecord?.isMuted && (
                <span className="flex items-center gap-1 text-orange-500 ml-1">
                  &bull; <BellOff className="w-3 h-3" /> Muted
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGroup && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleToggleMute} 
              disabled={isMuting}
              className={cn(conversation.myParticipantRecord?.isMuted && "text-orange-500")}
              title={conversation.myParticipantRecord?.isMuted ? "Unmute Notifications" : "Mute Notifications"}
            >
              {isMuting ? <Loader2 className="w-4 h-4 animate-spin" /> : conversation.myParticipantRecord?.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </Button>
          )}
          {!isBroadcast && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteChat}
              disabled={isDeletingChat}
              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
              title="Delete Chat"
            >
              {isDeletingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg: { id: string, senderId: string | null, content: string, createdAt: Date, sender: { firstName: string | null, lastName: string | null } | null }) => {
          const isMine = msg.senderId === currentUserId
          const senderName = msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Former Member'

          return (
            <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
              {(!isMine && (isGroup || isBroadcast)) && <span className="text-xs text-muted-foreground mb-1 ml-1">{senderName}</span>}
              <div className={cn(
                "px-4 py-2.5 rounded-2xl whitespace-pre-wrap text-sm break-words relative group/msg",
                isMine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
              )}>
                {formatMessageContent(msg.content)}
                {isBroadcast && isAdmin && (
                  <div className={cn(
                    "absolute top-0 bottom-0 flex items-center opacity-0 group-hover/msg:opacity-100 transition-opacity",
                    isMine ? "-left-8" : "-right-8"
                  )}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 h-6 w-6 rounded-full"
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="Delete Message"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Composer (Hidden for members in a broadcast) */}
      {!(isBroadcast && !isAdmin) && (
        <div className="p-4 border-t bg-background shrink-0">
          <div className="flex items-end gap-2">
            <Textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Type your message..."
              className="resize-none max-h-32 min-h-[44px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button size="icon" onClick={handleSend} disabled={!content.trim() || isSending} className="shrink-0 h-[44px] w-[44px]">
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Read-only state for members in a broadcast */}
      {isBroadcast && !isAdmin && (
        <div className="p-4 border-t bg-muted/30 text-center shrink-0">
          <p className="text-sm text-muted-foreground">
            This is a read-only broadcast. To reply, please start a direct message with an Admin.
          </p>
        </div>
      )}
    </div>
  )
}
