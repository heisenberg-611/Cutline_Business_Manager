'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, UserPlus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { getMembersForMessaging } from '../../actions/members'
import { addGroupMembers } from '../../actions/conversations'
import { MemberPicker, type Member } from '../new-message/MemberPicker'

export interface AddGroupMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversation: any
}

export function AddGroupMembersDialog({ open, onOpenChange, conversation }: AddGroupMembersDialogProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!open) return

    let mounted = true
    setIsLoading(true)
    setSelectedUserIds([])
    setError(null)

    getMembersForMessaging()
      .then(data => {
        if (mounted) setMembers(data as Member[])
      })
      .catch(() => {
        if (mounted) setError('Could not load the member list.')
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => { mounted = false }
  }, [open])

  // Anyone already in the group is not a candidate. getMembersForMessaging
  // already drops the current user.
  const candidates = useMemo(() => {
    const present = new Set<string>(
      (conversation?.participants ?? []).map((p: any) => p.userId)
    )
    return members.filter(m => !present.has(m.id))
  }, [members, conversation?.participants])

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleAdd = async () => {
    if (selectedUserIds.length === 0) return
    setIsSaving(true)
    setError(null)
    try {
      await addGroupMembers(conversation.id, selectedUserIds)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      onOpenChange(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not add those members.')
    } finally {
      setIsSaving(false)
    }
  }

  const groupName = conversation?.title || 'this group'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>
            Choose who to add to {groupName}. They will be able to read the messages
            already in this chat.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 flex-1 overflow-hidden flex flex-col min-h-0 gap-4">
          {!isLoading && candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Everyone in this business is already in the group.
            </p>
          ) : (
            <MemberPicker
              members={candidates}
              isLoading={isLoading}
              selectedUserIds={selectedUserIds}
              onToggleUser={toggleUser}
              disabled={isSaving}
            />
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 shrink-0">{error}</p>
          )}

          <div className="flex justify-end gap-2 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isSaving || selectedUserIds.length === 0}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add {selectedUserIds.length > 0 ? selectedUserIds.length : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
