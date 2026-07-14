'use client'

import { useConversations } from '../hooks'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, MessageSquare, Megaphone, Users } from 'lucide-react'
import { NewMessageModal } from './NewMessageModal'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function MessagingSidebar({ currentUserId, isAdmin }: { currentUserId: string, isAdmin: boolean }) {
  const { data: conversations, isLoading } = useConversations()
  const router = useRouter()
  const params = useParams()
  const activeId = params.id as string

  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="w-80 border-r flex flex-col bg-muted/20">
      <div className="p-4 border-b flex items-center justify-between bg-background">
        <h2 className="font-semibold text-lg tracking-tight">Messages</h2>
        {/* Allow all users to create group chats or DMs */}
        <Button size="icon" variant="ghost" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : conversations?.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No messages yet.
          </div>
        ) : (
          conversations?.map((conv) => {
            const isBroadcast = conv.type === 'BROADCAST'
            const isGroup = conv.type === 'GROUP'
            
            // For Direct Message, find the other person
            const otherParticipant = conv.participants?.find((p: { userId: string, user: { firstName: string | null, lastName: string | null } }) => p.userId !== currentUserId)?.user
            
            let title = 'Conversation'
            if (isBroadcast) title = 'Announcement'
            else if (isGroup) {
              if (conv.title) {
                title = conv.title
              } else {
                const names = conv.participants
                  ?.filter((p: any) => p.userId !== currentUserId)
                  ?.map((p: any) => p.user.firstName || p.user.email?.split('@')[0])
                  ?.join(', ')
                title = names || 'Group Chat'
              }
            } else if (otherParticipant) {
              title = `${otherParticipant.firstName} ${otherParticipant.lastName}`
            }
            
            return (
              <button
                key={conv.id}
                onClick={() => router.push(`/dashboard/messages/${conv.id}`)}
                className={cn(
                  "w-full text-left px-3 py-3 flex items-start gap-3 rounded-md transition-colors",
                  activeId === conv.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                )}
              >
                <div className={cn(
                  "mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  isBroadcast ? "bg-blue-500/10 text-blue-500" : isGroup ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
                )}>
                  {isBroadcast ? <Megaphone className="w-4 h-4" /> : isGroup ? <Users className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate">{title}</p>
                    {conv.unreadCount > 0 && activeId !== conv.id && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {isBroadcast ? 'Broadcast to all members' : isGroup ? `${conv.participants?.length || 0} members` : 'Direct Message'}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>

      <NewMessageModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        isAdmin={isAdmin}
      />
    </div>
  )
}
