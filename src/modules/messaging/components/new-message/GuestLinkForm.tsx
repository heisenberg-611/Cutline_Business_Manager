import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Copy } from 'lucide-react'
import { createBusinessGuestChatLink } from '../../actions/conversations'

interface GuestLinkFormProps {
  onBack: () => void
  onClose: () => void
  onSuccess: () => void
}

export function GuestLinkForm({ onBack, onClose, onSuccess }: GuestLinkFormProps) {
  const [isGenerating, setIsGenerating] = useState(true)
  const [generatedLink, setGeneratedLink] = useState('')
  const promiseRef = useRef<Promise<{ conversationId: string; token: string }> | null>(null)
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    let mounted = true
    setIsGenerating(true)
    
    if (!promiseRef.current) {
      promiseRef.current = createBusinessGuestChatLink()
    }

    promiseRef.current
      .then(({ token }) => {
        if (!mounted) return
        const link = `${window.location.origin}/chat/${token}`
        setGeneratedLink(link)
        onSuccessRef.current()
      })
      .catch((e: unknown) => {
        if (!mounted) return
        alert(e instanceof Error ? e.message : 'An error occurred')
      })
      .finally(() => {
        if (mounted) {
          setIsGenerating(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-4 flex flex-col h-full justify-center min-h-[200px]">
      {isGenerating ? (
        <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mb-4" />
          <p>Generating secure chat link...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with your client. They can click it to instantly start chatting with you, no account required.
          </p>
          <div className="flex gap-2">
            <Input readOnly value={generatedLink} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(generatedLink)}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="ghost" onClick={onBack}>Back</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </div>
  )
}
