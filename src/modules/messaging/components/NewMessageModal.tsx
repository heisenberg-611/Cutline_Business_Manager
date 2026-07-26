'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getMembersForMessaging } from '../actions/members'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Users, Link as LinkIcon } from 'lucide-react'

import { MemberPicker, type Member } from './new-message/MemberPicker'
import { DirectMessageForm } from './new-message/DirectMessageForm'
import { GroupConversationForm } from './new-message/GroupConversationForm'
import { BroadcastForm } from './new-message/BroadcastForm'
import { GuestLinkForm } from './new-message/GuestLinkForm'

export function NewMessageModal({ open, onOpenChange, isAdmin }: { open: boolean, onOpenChange: (o: boolean) => void, isAdmin?: boolean }) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [mode, setMode] = useState<'SELECT' | 'BROADCAST' | 'GUEST'>('SELECT')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    let mounted = true
    if (open) {
      setIsLoading(true)
      getMembersForMessaging().then(data => {
        if (mounted) {
          setMembers(data as Member[])
          setIsLoading(false)
        }
      })
    }
    return () => { mounted = false }
  }, [open])

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setMode('SELECT')
      setSelectedUserIds([])
    }
  }, [open])

  const handleModeSwitch = (newMode: 'SELECT' | 'BROADCAST' | 'GUEST') => {
    setMode(newMode)
    setSelectedUserIds([]) // Clear selection on mode switch to prevent state leaks
  }

  const handleSuccess = (conversationId: string) => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
    onOpenChange(false)
    router.push(`/dashboard/messages/${conversationId}`)
  }

  const handleGuestLinkSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
  }

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'SELECT' ? 'New Message' : mode === 'BROADCAST' ? 'Send Broadcast' : 'Temporary Chat Link'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'SELECT' 
              ? 'Select one or more members to start a chat.' 
              : mode === 'BROADCAST'
              ? 'This message will be sent to every active member in the business.'
              : 'Generate a secure, temporary link to chat with a client outside the app.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 flex-1 overflow-hidden flex flex-col min-h-0">
          {mode === 'SELECT' ? (
            <div className="space-y-4 flex flex-col flex-1 min-h-0">
              {isAdmin && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1 shrink-0"
                  onClick={() => handleModeSwitch('BROADCAST')}
                >
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <Users className="w-4 h-4" /> Broadcast Announcement
                  </div>
                  <p className="text-xs text-muted-foreground font-normal">Send a one-way message to all members.</p>
                </Button>
              )}

              <Button 
                variant="outline" 
                className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1 shrink-0 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-900/10 dark:hover:bg-indigo-900/20"
                onClick={() => handleModeSwitch('GUEST')}
              >
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold">
                  <LinkIcon className="w-4 h-4" /> Generate Client Chat Link
                </div>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 font-normal">Create a temporary link to chat with an external client.</p>
              </Button>

              <MemberPicker 
                members={members} 
                isLoading={isLoading} 
                selectedUserIds={selectedUserIds} 
                onToggleUser={toggleUser} 
              />

              {selectedUserIds.length === 1 && (
                <DirectMessageForm 
                  selectedUserId={selectedUserIds[0]} 
                  onSuccess={handleSuccess} 
                />
              )}

              {selectedUserIds.length > 1 && (
                <GroupConversationForm 
                  selectedUserIds={selectedUserIds} 
                  onSuccess={handleSuccess} 
                />
              )}
            </div>
          ) : mode === 'BROADCAST' ? (
            <BroadcastForm 
              onBack={() => handleModeSwitch('SELECT')} 
              onSuccess={handleSuccess} 
            />
          ) : (
            <GuestLinkForm 
              onBack={() => handleModeSwitch('SELECT')} 
              onClose={() => onOpenChange(false)} 
              onSuccess={handleGuestLinkSuccess} 
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
