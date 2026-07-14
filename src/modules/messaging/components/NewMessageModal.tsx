'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { getMembersForMessaging, getOrCreateDirectConversation, createBroadcast, createGroupConversation } from '../actions'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Users, X, Check } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function NewMessageModal({ open, onOpenChange, isAdmin }: { open: boolean, onOpenChange: (o: boolean) => void, isAdmin?: boolean }) {
  const [members, setMembers] = useState<{ id: string, firstName: string | null, lastName: string | null, email: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  
  const [mode, setMode] = useState<'SELECT' | 'BROADCAST'>('SELECT')
  const [broadcastContent, setBroadcastContent] = useState('')
  
  // Group chat selection state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [groupTitle, setGroupTitle] = useState('')
  
  const router = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    let mounted = true
    if (open) {
      setIsLoading(true)
      getMembersForMessaging().then(data => {
        if (mounted) {
          setMembers(data as { id: string, firstName: string | null, lastName: string | null, email: string }[])
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
      setBroadcastContent('')
      setSelectedUserIds([])
      setSearchQuery('')
      setGroupTitle('')
    }
  }, [open])

  const handleCreateChat = async () => {
    if (selectedUserIds.length === 0) return
    
    setIsSending(true)
    try {
      if (selectedUserIds.length === 1) {
        // Direct Message
        const conv = await getOrCreateDirectConversation(selectedUserIds[0])
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
        onOpenChange(false)
        router.push(`/dashboard/messages/${conv.id}`)
      } else {
        // Group Chat
        const conv = await createGroupConversation(selectedUserIds, groupTitle)
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
        onOpenChange(false)
        router.push(`/dashboard/messages/${conv.id}`)
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsSending(false)
    }
  }

  const handleSendBroadcast = async () => {
    if (!broadcastContent.trim()) return
    setIsSending(true)
    try {
      const { conversation } = await createBroadcast(broadcastContent)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      onOpenChange(false)
      router.push(`/dashboard/messages/${conversation.id}`)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsSending(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const filteredMembers = members.filter(m => 
    (m.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (m.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{mode === 'SELECT' ? 'New Message' : 'Send Broadcast'}</DialogTitle>
          <DialogDescription>
            {mode === 'SELECT' 
              ? 'Select one or more members to start a chat.' 
              : 'This message will be sent to every active member in the business.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 flex-1 overflow-hidden flex flex-col min-h-0">
          {mode === 'SELECT' ? (
            <div className="space-y-4 flex flex-col flex-1 min-h-0">
              {isAdmin && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4 flex flex-col items-start gap-1 shrink-0"
                  onClick={() => setMode('BROADCAST')}
                >
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <Users className="w-4 h-4" /> Broadcast Announcement
                  </div>
                  <p className="text-xs text-muted-foreground font-normal">Send a one-way message to all members.</p>
                </Button>
              )}

              <div className="flex flex-col gap-2 shrink-0">
                {selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30">
                    {selectedUserIds.map(id => {
                      const m = members.find(u => u.id === id)
                      if (!m) return null
                      return (
                        <div key={id} className="flex items-center gap-1 bg-background border px-2 py-1 rounded-full text-xs font-medium">
                          {m.firstName}
                          <button onClick={() => toggleUser(id)} className="hover:bg-muted rounded-full p-0.5"><X className="w-3 h-3" /></button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <Input 
                  placeholder="Search members..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-[150px] border rounded-md p-1">
                {isLoading ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                ) : filteredMembers.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No members found.</p>
                ) : (
                  <div className="space-y-1">
                    {filteredMembers.map(m => {
                      const isSelected = selectedUserIds.includes(m.id)
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleUser(m.id)}
                          disabled={isSending}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors",
                            isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn("w-4 h-4 rounded-sm border flex items-center justify-center", isSelected ? "bg-primary border-primary" : "border-input")}>
                              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            <span className="text-sm font-medium">{m.firstName} {m.lastName}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{m.email}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {selectedUserIds.length > 0 && (
                <div className="shrink-0 space-y-3 pt-2">
                  {selectedUserIds.length > 1 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Group Name (Optional)</label>
                      <Input 
                        placeholder="e.g. Design Team" 
                        value={groupTitle}
                        onChange={e => setGroupTitle(e.target.value)}
                      />
                    </div>
                  )}
                  <Button onClick={handleCreateChat} disabled={isSending} className="w-full">
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : selectedUserIds.length > 1 ? 'Create Group Chat' : 'Start Chat'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea 
                placeholder="Type your announcement here..."
                value={broadcastContent}
                onChange={e => setBroadcastContent(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setMode('SELECT')} disabled={isSending}>Back</Button>
                <Button onClick={handleSendBroadcast} disabled={isSending || !broadcastContent.trim()}>
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Broadcast'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
