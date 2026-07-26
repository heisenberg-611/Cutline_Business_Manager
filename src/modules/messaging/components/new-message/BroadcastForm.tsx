import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { createBroadcast } from '../../actions/conversations'

interface BroadcastFormProps {
  onBack: () => void
  onSuccess: (conversationId: string) => void
}

export function BroadcastForm({ onBack, onSuccess }: BroadcastFormProps) {
  const [isSending, setIsSending] = useState(false)
  const [broadcastContent, setBroadcastContent] = useState('')

  const handleSendBroadcast = async () => {
    if (!broadcastContent.trim()) return
    setIsSending(true)
    try {
      const { conversation } = await createBroadcast(broadcastContent)
      onSuccess(conversation.id)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'An error occurred')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-4 flex flex-col h-full min-h-0">
      <Textarea 
        placeholder="Type your announcement here..."
        value={broadcastContent}
        onChange={e => setBroadcastContent(e.target.value)}
        rows={5}
        className="resize-none flex-1"
        disabled={isSending}
      />
      <div className="flex gap-2 justify-end shrink-0">
        <Button variant="ghost" onClick={onBack} disabled={isSending}>Back</Button>
        <Button onClick={handleSendBroadcast} disabled={isSending || !broadcastContent.trim()}>
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Broadcast'}
        </Button>
      </div>
    </div>
  )
}
