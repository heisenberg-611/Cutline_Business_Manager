import React, { useRef, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Trash2, Shield } from 'lucide-react'

const AnimatedMeme = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loopCount, setLoopCount] = useState(0)

  const handleEnded = () => {
    // 0-indexed: < 1 means it will run twice total
    if (loopCount < 1) {
      setLoopCount(prev => prev + 1)
      videoRef.current?.play().catch(() => {})
    }
  }

  const handleMouseEnter = () => {
    setLoopCount(0)
    videoRef.current?.play().catch(() => {})
  }

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      muted
      playsInline
      onEnded={handleEnded}
      onMouseEnter={handleMouseEnter}
      style={{ width: '250px', height: '250px' }}
      className="rounded-lg object-contain cursor-pointer bg-muted/50"
    />
  )
}

function isOnlyEmojis(str: string) {
  const withoutSpaces = str.replace(/\s+/g, '');
  if (!withoutSpaces) return false;
  // Replace all emoji-related characters. If nothing is left, it's purely emojis.
  const emojiRegex = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{200D}\u{FE0F}]/gu;
  const replaced = withoutSpaces.replace(emojiRegex, '');
  return replaced.length === 0;
}

function formatMessageContent(text: string) {
  const LINK_REGEX = /(https?:\/\/[^\s]+)|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|((?:\+?[0-9]{1,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/g;
  
  const parts = text.split(LINK_REGEX);
  return parts.map((part, i) => {
    if (!part) return null;
    
    if (/(https?:\/\/[^\s]+)/.test(part)) {
      let hostname = '';
      let pathname = '';
      try {
        const parsedUrl = new URL(part);
        hostname = parsedUrl.hostname;
        pathname = parsedUrl.pathname;
      } catch (e) {
        // Not a valid URL
      }

      const isGiphy = hostname === 'media.giphy.com' && pathname.startsWith('/media/');
      if (/\.(mp4)(\?.*)?$/i.test(part) || isGiphy) {
        let mediaSrc = part;
        // Upgrade legacy giphy links to mp4 for controlled playback
        if (isGiphy && !part.includes('.mp4')) {
          mediaSrc = part.replace(/\.(webp|gif)(\?.*)?$/, '.mp4');
        }
        
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="block my-2" onClick={(e) => e.preventDefault()}>
            <AnimatedMeme src={mediaSrc} />
          </a>
        );
      }

      const isTenor = hostname === 'media.tenor.com';
      if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(part) || isTenor) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="block my-2">
            <img 
              src={part} 
              alt="Attachment" 
              loading="lazy"
              decoding="async"
              style={{ width: '250px', height: '250px' }}
              className="rounded-lg object-contain bg-muted/50" 
            />
          </a>
        );
      }
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all">{part}</a>;
    }
    if (/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/.test(part)) {
      return <a key={i} href={`mailto:${part}`} className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all">{part}</a>;
    }
    if (/((?:\+?[0-9]{1,3}[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/.test(part)) {
      return <a key={i} href={`tel:${part.replace(/[^\d+]/g, '')}`} className="underline underline-offset-2 hover:opacity-80 transition-opacity break-all">{part}</a>;
    }
    
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export interface MessageItemProps {
  msg: any
  currentUserId: string | null
  conversation: any
  isAdmin: boolean
  onDeleteMessage?: (msgId: string) => void
}

export const MessageItem = React.memo(function MessageItem({
  msg,
  currentUserId,
  conversation,
  isAdmin,
  onDeleteMessage
}: MessageItemProps) {
  const isMine = currentUserId ? msg.senderId === currentUserId : msg.isGuest === true;
  
  const isGroup = conversation?.type === 'GROUP'
  const isBroadcast = conversation?.type === 'BROADCAST'
  const isGuest = conversation?.type === 'GUEST_LINK'

  let senderName = msg.sender ? `${msg.sender.firstName} ${msg.sender.lastName}` : 'Former Member'
  if (msg.isGuest) {
    senderName = conversation?.guestName || conversation?.client?.displayName || 'Client/Guest'
  }

  const isSenderAdmin = msg.sender?.memberships?.[0]?.role === 'org:admin'
  const onlyEmojis = isOnlyEmojis(msg.content)

  return (
    <div className="py-2 px-4">
      <div className={cn("flex flex-col max-w-[90%] md:max-w-[80%]", isMine ? "ml-auto items-end" : "mr-auto items-start")}>
        {(!isMine && (isGroup || isBroadcast || isGuest)) && (
          <span className="text-xs text-muted-foreground mb-1 ml-1 flex items-center gap-1">
            {senderName}
            {isSenderAdmin && <Shield className="w-3 h-3 text-primary/70" />}
          </span>
        )}
        <div className={cn(
          "rounded-2xl whitespace-pre-wrap break-words relative group/msg",
          onlyEmojis 
            ? "bg-transparent p-0 text-5xl leading-tight" 
            : cn(
                "px-4 py-2.5 text-sm",
                isMine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
              ),
          msg.isOptimistic && "opacity-70"
        )}>
          {formatMessageContent(msg.content)}
          {isBroadcast && isAdmin && (
            <div className={cn(
              "absolute top-0 bottom-0 flex items-center md:opacity-0 md:group-hover/msg:opacity-100 transition-opacity",
              isMine ? "-left-8" : "-right-8"
            )}>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 h-6 w-6 rounded-full"
                onClick={() => onDeleteMessage?.(msg.id)}
                title="Delete Message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1 mx-1">
          {format(new Date(msg.createdAt), 'MMM d, h:mm a')}
        </span>
      </div>
    </div>
  )
})
