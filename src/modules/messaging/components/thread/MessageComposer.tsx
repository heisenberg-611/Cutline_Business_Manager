import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Ghost, Send, SmilePlus } from 'lucide-react'
import { MemeFinder } from '../MemeFinder'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export interface MessageComposerProps {
  onSend: (content: string) => Promise<void>
  isSending: boolean
  cooldownRemaining: number
  isBroadcast: boolean
  isAdmin: boolean
  scrollToBottom: () => void
}

export function MessageComposer({
  onSend,
  isSending,
  cooldownRemaining,
  isBroadcast,
  isAdmin,
  scrollToBottom
}: MessageComposerProps) {
  const [content, setContent] = useState('')
  const [isMemeFinderOpen, setIsMemeFinderOpen] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSend = async () => {
    const text = content.trim()
    if (!text) return
    setContent('')
    scrollToBottom()
    try {
      await onSend(text)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'An error occurred')
      setContent(text) // Restore on failure
    }
  }

  // Hide the entire composer for non-admin members in a broadcast
  if (isBroadcast && !isAdmin) {
    return (
      <div className="p-4 border-t bg-muted/30 text-center shrink-0">
        <p className="text-sm text-muted-foreground">
          This is a read-only broadcast. To reply, please start a direct message with an Admin.
        </p>
      </div>
    )
  }

  return (
    <>
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
                <div className="absolute bottom-12 -left-2 sm:left-0 z-50 shadow-xl rounded-lg overflow-hidden w-[300px] sm:w-[350px]">
                  <EmojiPicker 
                    onEmojiClick={(emojiData) => setContent(prev => prev + emojiData.emoji)}
                    theme={resolvedTheme === 'dark' ? Theme.DARK : Theme.LIGHT}
                    lazyLoadEmojis={true}
                    width="100%"
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
      
      <MemeFinder 
        open={isMemeFinderOpen} 
        onOpenChange={setIsMemeFinderOpen} 
        onSelect={async (url) => {
          scrollToBottom()
          try {
            await onSend(url)
          } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'An error occurred')
          }
        }} 
      />
    </>
  )
}
