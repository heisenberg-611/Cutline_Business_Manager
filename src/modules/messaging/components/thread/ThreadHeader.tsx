import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuGroup } from '@/components/ui/dropdown-menu'
import { Megaphone, Loader2, Users, MessageSquare, Bell, BellOff, Trash2, ChevronLeft, Timer, Check, Shield, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toggleMuteConversation, deleteConversation } from '../../actions'

export interface ThreadHeaderProps {
  conversation: any
  currentUserId: string
  isAdmin: boolean
  isUpdatingSlowMode: boolean
  updateSlowMode: (data: { enabled: boolean, cooldown: number }) => void
}

export function ThreadHeader({
  conversation,
  currentUserId,
  isAdmin,
  isUpdatingSlowMode,
  updateSlowMode
}: ThreadHeaderProps) {
  const [isMuting, setIsMuting] = useState(false)
  const [isDeletingChat, setIsDeletingChat] = useState(false)
  const queryClient = useQueryClient()
  const router = useRouter()

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
    
    let promptMsg = 'Are you sure you want to delete this chat? This cannot be undone.'
    if (isAdmin && isGuest) {
      promptMsg = 'Are you sure you want to permanently delete this guest chat? The guest will no longer be able to access the link.'
    }
    
    const confirmed = confirm(promptMsg)
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

  return (
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
            {conversation?.myParticipantRecord?.isMuted && (
              <span className="flex items-center gap-1 text-orange-500 ml-1">
                &bull; <BellOff className="w-3 h-3" /> Muted
              </span>
            )}
            {conversation?.slowModeEnabled && (
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
        {isGuest && conversation.guestToken && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const url = `${window.location.origin}/chat/${conversation.guestToken}`
              navigator.clipboard.writeText(url)
              alert('Guest chat link copied to clipboard!')
            }}
            className="text-purple-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10"
            title="Copy Guest Link"
          >
            <Copy className="w-4 h-4" />
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
  )
}
