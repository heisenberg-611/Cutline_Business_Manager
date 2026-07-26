import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { getOrCreateDirectConversation } from '../../actions/conversations'

interface DirectMessageFormProps {
  selectedUserId: string
  onSuccess: (conversationId: string) => void
}

export function DirectMessageForm({ selectedUserId, onSuccess }: DirectMessageFormProps) {
  const [isSending, setIsSending] = useState(false)

  const handleCreateChat = async () => {
    setIsSending(true)
    try {
      const conv = await getOrCreateDirectConversation(selectedUserId)
      onSuccess(conv.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="shrink-0 space-y-3 pt-2">
      <Button onClick={handleCreateChat} disabled={isSending} className="w-full">
        {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Chat'}
      </Button>
    </div>
  )
}
