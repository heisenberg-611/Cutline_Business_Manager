import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Trash2, Shield } from 'lucide-react'
import { ReactionBar } from '@/modules/reactions/components/ReactionBar'

// Every attachment gets this exact box, reserved before the bytes arrive. The
// list is virtualized and measures each row, so any media that sizes itself
// only once it has loaded drags the scroll position with it.
const MEDIA_BOX = { width: 250, height: 250 } as const

const AnimatedMeme = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  // A ref, not state: the loop counter is never rendered, and re-rendering a
  // row mid-playback makes Virtuoso re-measure it for no reason.
  const loopCountRef = useRef(0)

  useEffect(() => {
    loopCountRef.current = 0
  }, [src])

  const handleEnded = useCallback(() => {
    // 0-indexed: < 1 means it will run twice total
    if (loopCountRef.current < 1) {
      loopCountRef.current += 1
      videoRef.current?.play().catch(() => {})
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    loopCountRef.current = 0
    videoRef.current?.play().catch(() => {})
  }, [])

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      muted
      playsInline
      disablePictureInPicture
      onEnded={handleEnded}
      onMouseEnter={handleMouseEnter}
      width={MEDIA_BOX.width}
      height={MEDIA_BOX.height}
      style={MEDIA_BOX}
      // `block` matters: as an inline element the video sits on a text baseline,
      // so the row grew by the descender gap once fonts settled.
      className="block rounded-lg object-contain cursor-pointer bg-muted/50"
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
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="block my-2" style={MEDIA_BOX} onClick={(e) => e.preventDefault()}>
            <AnimatedMeme src={mediaSrc} />
          </a>
        );
      }

      const isTenor = hostname === 'media.tenor.com';
      if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(part) || isTenor) {
        return (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="block my-2" style={MEDIA_BOX}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={part}
              alt="Attachment"
              // Not lazy: rows only exist in the DOM while they are near the
              // viewport, so lazy loading here just delays the paint of
              // something already on screen.
              decoding="async"
              width={MEDIA_BOX.width}
              height={MEDIA_BOX.height}
              style={MEDIA_BOX}
              className="block rounded-lg object-contain bg-muted/50"
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
  /** What this workspace offers; empty disables the control entirely. */
  reactionEmojis?: string[]
  onDeleteMessage?: (msgId: string) => void
}

/** Cheap structural compare; the list is a handful of entries at most. */
function reactionsEqual(a: any[] | undefined, b: any[] | undefined) {
  if (a === b) return true
  if (!a || !b || a.length !== b.length) return false
  return a.every(
    (g, i) => g.emoji === b[i].emoji && g.count === b[i].count && g.reacted === b[i].reacted
  )
}

// Default shallow compare never held: `conversation` gets a fresh identity on
// every conversations refetch and both call sites pass inline callbacks, so
// every row re-rendered on every parent render. Compare the values that are
// actually painted instead.
function arePropsEqual(prev: MessageItemProps, next: MessageItemProps) {
  const a = prev.msg
  const b = next.msg
  return (
    a.id === b.id &&
    a.content === b.content &&
    a.senderId === b.senderId &&
    a.isGuest === b.isGuest &&
    a.isOptimistic === b.isOptimistic &&
    a.sender?.firstName === b.sender?.firstName &&
    a.sender?.lastName === b.sender?.lastName &&
    a.sender?.memberships?.[0]?.role === b.sender?.memberships?.[0]?.role &&
    reactionsEqual(a.reactions, b.reactions) &&
    prev.reactionEmojis === next.reactionEmojis &&
    prev.currentUserId === next.currentUserId &&
    prev.isAdmin === next.isAdmin &&
    prev.conversation?.id === next.conversation?.id &&
    prev.conversation?.type === next.conversation?.type &&
    prev.conversation?.guestName === next.conversation?.guestName &&
    prev.conversation?.client?.displayName === next.conversation?.client?.displayName
  )
}

export const MessageItem = React.memo(function MessageItem({
  msg,
  currentUserId,
  conversation,
  isAdmin,
  reactionEmojis = [],
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
  // Both walk the message text with regexes; the content is immutable once sent.
  const onlyEmojis = useMemo(() => isOnlyEmojis(msg.content), [msg.content])
  const body = useMemo(() => formatMessageContent(msg.content), [msg.content])
  const timestamp = useMemo(() => format(new Date(msg.createdAt), 'MMM d, h:mm a'), [msg.createdAt])

  return (
    <div className="py-2 px-4 group/reactable">
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
            ? "bg-transparent p-0 text-4xl md:text-5xl leading-tight" 
            : cn(
                "px-4 py-2.5 text-sm",
                isMine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
              ),
          msg.isOptimistic && "opacity-70"
        )}>
          {body}
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
        {(reactionEmojis.length > 0 || (msg.reactions?.length ?? 0) > 0) && (
          <ReactionBar
            targetType="Message"
            targetId={msg.id}
            reactions={msg.reactions ?? []}
            emojiSet={reactionEmojis}
            // An optimistic message has no row to react to yet, and a guest has
            // no account to attribute it to.
            canReact={!msg.isOptimistic && !!currentUserId}
            align={isMine ? 'end' : 'start'}
          />
        )}
        <span className="text-[10px] text-muted-foreground mt-1 mx-1">
          {timestamp}
        </span>
      </div>
    </div>
  )
}, arePropsEqual)
