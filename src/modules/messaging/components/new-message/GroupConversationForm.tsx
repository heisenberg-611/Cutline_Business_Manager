import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { createGroupConversation } from '../../actions/conversations'

interface GroupConversationFormProps {
  selectedUserIds: string[]
  onSuccess: (conversationId: string) => void
}

export function GroupConversationForm({ selectedUserIds, onSuccess }: GroupConversationFormProps) {
  const [isSending, setIsSending] = useState(false)
  const [groupTitle, setGroupTitle] = useState('')

  const handleCreateChat = async () => {
    setIsSending(true)
    try {
      const conv = await createGroupConversation(selectedUserIds, groupTitle)
      onSuccess(conv.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="shrink-0 space-y-3 pt-2">
      <div className="space-y-1">
        <label className="text-xs font-medium">Group Name (Optional)</label>
        <Input 
          placeholder="e.g. Design Team" 
          value={groupTitle}
          onChange={e => setGroupTitle(e.target.value)}
          disabled={isSending}
        />
      </div>
      <Button onClick={handleCreateChat} disabled={isSending} className="w-full">
        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group Chat'}
      </Button>
    </div>
  )
}
