'use client'

import { useConversationMessages, useConversations } from '../hooks'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Ghost, Send, Megaphone, Loader2, Users, MessageSquare, Bell, BellOff, Trash2, RefreshCcw, SmilePlus, ChevronLeft, Timer, Check, Shield } from 'lucide-react'
import { MemeFinder } from './MemeFinder'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { useTheme } from 'next-themes'
import { toggleMuteConversation, deleteConversation, deleteMessage } from '../actions'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import React from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu'
import { useRouter } from 'next/navigation'
import { useMessagingConfig } from './QueryProvider'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'

const AnimatedMeme = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loopCount, setLoopCount] = useState(0)

  const handleEnded = () => {
    // 0-indexed: < 1 means it will run twice total
    if (loopCount < 1) {
      setLoopCount(prev => prev + 1)
      videoRef.current?.play().catch(() => {})
    }
  }

  const handleMouseEnter = () => {
    setLoopCount(0)
    videoRef.current?.play().catch(() => {})
  }

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      muted
      playsInline
      onEnded={handleEnded}
      onMouseEnter={handleMouseEnter}
      style={{ width: '250px', height: '250px' }}
      className="rounded-lg object-contain cursor-pointer bg-muted/50"
    />
  )
}

function isOnlyEmojis(str: string) {
  const withoutSpaces = str.replace(/\s+/g, '');
  if (!withoutSpaces) return false;
  // Replace all emoji-related characters. If nothing is left, it's purely emojis.
  const emojiRegex = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{200D}\u{FE0F}]/gu;
  const replaced = withoutSpaces.replace(emojiRegex, '');
  return replaced.length === 0;
}

function formatMessageContent(text: string) {
  const LINK_REGEX = /(https?:\/\/[^\s]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|((?:\+?[0-9]{1,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
  
  const parts = text.split(LINK_REGEX);
  return parts.map((part, i) => {
    if (!part) return null;
    
    if (/(https?:\/\/[^\s]+)/.test(part)) {
      let hostname = '';
      let pathname = '';
      try {
        const parsedUrl = new URL(part);
        hostname = parsedUrl.hostname;
        pathname = parsedUrl.pathname;
      } catch (e) {
        // Not a valid URL
      }

      const isGiphy = hostname === 'media.giphy.com' && pathname.startsWith('/media/');
      if (/\.(mp4)(\?.*)?$/i.test(part) || isGiphy) {
        let mediaSrc = part;
        // Upgrade legacy giphy links to mp4 for controlled playback
        if (isGiphy && !part.includes('.mp4')) {
          mediaSrc = part.replace(/\.(webp|gif)(\?.*)?$/, '.mp4');
        }
        
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="block my-2" onClick={(e) => e.preventDefault()}>
            <AnimatedMeme src={mediaSrc} />
          </a>
        );
      }

      const isTenor = hostname === 'media.tenor.com';
      if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(part) || isTenor) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="block my-2">
            <img 
              src={part} 
              alt="Attachment" 
              loading="lazy"
              decoding="async"
              style={{ width: '250px', height: '250px' }}
              className="rounded-lg object-contain bg-muted/50" 
            />
          </a>
        );
      }
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
  const { messages, isLoading, sendMessage, isSending, markAsRead, refetch, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage, updateSlowMode, isUpdatingSlowMode } = useConversationMessages(conversationId, currentUserId)
  const { data: conversations } = useConversations()
  const [content, setContent] = useState('')
  const [isMuting, setIsMuting] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()
  const [isDeletingChat, setIsDeletingChat] = useState(false)
  const { realtimeEnabled } = useMessagingConfig()
  const [isMemeFinderOpen, setIsMemeFinderOpen] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const { resolvedTheme } = useTheme()
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  const conversation = conversations?.find(c => c.id === conversationId)
  const isBroadcast = conversation?.type === 'BROADCAST'
  const isGroup = conversation?.type === 'GROUP'
  const isGuest = conversation?.type === 'GUEST_LINK'
  
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
  } else if (isGuest) {
    headerTitle = conversation.guestName || conversation.client?.displayName || 'Client/Guest Chat'
    headerSubtitle = 'Temporary External Chat'
  }

  const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

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
  }, [messages, conversation?.slowModeEnabled, conversation?.slowModeCooldown, isAdmin, currentUserId, isGroup])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const scrollToBottom = () => {
    // Wait for the optimistic update to append the message to the list
    setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'smooth' })
    }, 50)
  }

  const handleSend = async () => {
    const text = content.trim()
    if (!text) return
    setContent('')
    scrollToBottom()
    try {
      await sendMessage(text)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'An error occurred')
      setContent(text)
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
    
    // Optimistically remove from UI
    queryClient.setQueryData(['messages', conversationId], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: old.messages.filter((m: any) => m.id !== msgId)
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
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  if (!conversation) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Conversation not found.</div>
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/dashboard/messages')} 
            className="md:hidden mr-0 -ml-2 h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            isBroadcast ? "bg-blue-500/10 text-blue-500" : isGroup ? "bg-green-500/10 text-green-600" : isGuest ? "bg-purple-500/10 text-purple-600" : "bg-primary/10 text-primary"
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
                  <DropdownMenuContent align="start" className="w-auto min-w-[250px] max-w-[calc(100vw-2rem)] sm:max-w-[400px] max-h-[50vh] overflow-y-auto">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>Group Members ({conversation.participants?.length || 0})</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {conversation.participants?.map((p: any) => {
                        const isMemberAdmin = p.user?.memberships?.[0]?.role === 'org:admin'
                        return (
                          <DropdownMenuItem key={p.userId} className="flex flex-col items-start gap-0.5">
                            <div className="flex items-center gap-1 w-full">
                              <span className="font-medium text-sm truncate">{p.user?.firstName || 'Unknown'} {p.user?.lastName || ''} {p.userId === currentUserId && '(You)'}</span>
                              {isMemberAdmin && <Shield className="w-3 h-3 text-primary shrink-0 ml-auto" />}
                            </div>
                            <span className="text-xs text-muted-foreground truncate w-full text-left">{p.user?.email}</span>
                          </DropdownMenuItem>
                        )
                      })}
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
              {conversation.slowModeEnabled && (
                <span className="flex items-center gap-1 text-blue-500 ml-1">
                  &bull; <Timer className="w-3 h-3" /> Slow Mode ({conversation.slowModeCooldown}s)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && isGroup && (
            <DropdownMenu>
              <DropdownMenuTrigger render={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={isUpdatingSlowMode}
                  className={cn(conversation.slowModeEnabled && "text-blue-500 hover:text-blue-600")}
                  title={conversation.slowModeEnabled ? `Slow Mode (${conversation.slowModeCooldown}s)` : "Enable Slow Mode"}
                />
              }>
                <Timer className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Slow Mode</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => updateSlowMode({ enabled: false, cooldown: 0 })}>
                    Off {!conversation.slowModeEnabled && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSlowMode({ enabled: true, cooldown: 5 })}>
                    5 seconds {(conversation.slowModeEnabled && conversation.slowModeCooldown === 5) && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSlowMode({ enabled: true, cooldown: 10 })}>
                    10 seconds {(conversation.slowModeEnabled && conversation.slowModeCooldown === 10) && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSlowMode({ enabled: true, cooldown: 30 })}>
                    30 seconds {(conversation.slowModeEnabled && conversation.slowModeCooldown === 30) && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => updateSlowMode({ enabled: true, cooldown: 60 })}>
                    1 minute {(conversation.slowModeEnabled && conversation.slowModeCooldown === 60) && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
      
      {/* Mode Indicator & Refresh */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/20 border-b shrink-0">
        {realtimeEnabled ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Real-time Enabled
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Manual Mode: Click refresh to get new messages
          </div>
        )}
        
        {!realtimeEnabled && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-7 text-xs" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCcw className={cn("w-3 h-3 mr-2", isFetching && "animate-spin")} />
            Refresh
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0">
        <Virtuoso
          ref={virtuosoRef}
          className="h-full w-full"
          data={messages}
          initialTopMostItemIndex={messages.length - 1}
          computeItemKey={(index, item) => item.id}
          alignToBottom
          increaseViewportBy={200}
          followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          startReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage()
            }
          }}
          components={{
            Header: () => (
              <div className="h-12 flex justify-center items-center">
                {isFetchingNextPage ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : null}
              </div>
            )
          }}
          itemContent={(index, msg: any) => {
            const isMine = msg.senderId === currentUserId
            
            let senderName = msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Former Member'
            if (msg.isGuest) {
              senderName = conversation.guestName || conversation.client?.displayName || 'Client/Guest'
            }

            const isSenderAdmin = msg.sender?.memberships?.[0]?.role === 'org:admin'
            const onlyEmojis = isOnlyEmojis(msg.content)

            return (
              <div className="py-2 px-4">
                <div key={msg.id} className={cn("flex flex-col max-w-[90%] md:max-w-[80%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
                  {(!isMine && (isGroup || isBroadcast || isGuest)) && (
                    <span className="text-xs text-muted-foreground mb-1 ml-1 flex items-center gap-1">
                      {senderName}
                      {isSenderAdmin && <Shield className="w-3 h-3 text-primary/70" />}
                    </span>
                  )}
                  <div className={cn(
                    "rounded-2xl whitespace-pre-wrap break-words relative group/msg",
                    onlyEmojis 
                      ? "bg-transparent p-0 text-5xl leading-tight" 
                      : cn(
                          "px-4 py-2.5 text-sm",
                          isMine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
                        ),
                    msg.isOptimistic && "opacity-70"
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
              </div>
            )
          }}
        />
      </div>

      {/* Composer (Hidden for members in a broadcast) */}
      {!(isBroadcast && !isAdmin) && (
        <div className="p-2 sm:p-4 border-t bg-background shrink-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pb-4">
          <div className="flex items-end gap-1 sm:gap-2">
            <div className="flex gap-1 shrink-0">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsMemeFinderOpen(true)}
                className="shrink-0 h-[44px] w-[44px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                title="Add Meme"
              >
                <Ghost className="w-5 h-5" />
              </Button>
              <div ref={emojiPickerRef} className="relative">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setIsEmojiPickerOpen(prev => !prev)}
                  className="shrink-0 h-[44px] w-[44px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                  title="Add Emoji"
                >
                  <SmilePlus className="w-5 h-5" />
                </Button>
                {isEmojiPickerOpen && (
                  <div className="absolute bottom-12 left-0 z-50 shadow-xl rounded-lg">
                    <EmojiPicker 
                      onEmojiClick={(emojiData) => setContent(prev => prev + emojiData.emoji)}
                      theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                      lazyLoadEmojis={true}
                    />
                  </div>
                )}
              </div>
            </div>
            <Textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={cooldownRemaining > 0 ? `Slow mode active. Wait ${cooldownRemaining}s...` : "Type your message..."}
              disabled={cooldownRemaining > 0}
              className={cn("resize-none max-h-32 min-h-[44px] text-base py-2.5", cooldownRemaining > 0 && "opacity-50 cursor-not-allowed")}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (cooldownRemaining === 0) handleSend()
                }
              }}
            />
            <Button 
              onClick={handleSend} 
              disabled={!content.trim() || isSending || cooldownRemaining > 0} 
              className="shrink-0 h-[44px] px-6"
            >
              <Send className="w-4 h-4" />
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
      
      <MemeFinder 
        open={isMemeFinderOpen} 
        onOpenChange={setIsMemeFinderOpen} 
        onSelect={async (url) => {
          scrollToBottom()
          try {
            await sendMessage(url)
          } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'An error occurred')
          }
        }} 
      />
    </div>
  )
}
