'use client';

import { useState, useEffect, useRef } from 'react';
import { sendGuestMessage, getNewGuestMessages, saveGuestName } from '@/modules/messaging/guest-actions';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageList } from '@/modules/messaging/components/thread/MessageList';
import { ThreadHeader } from '@/modules/messaging/components/thread/ThreadHeader';
import { MessageComposer } from '@/modules/messaging/components/thread/MessageComposer';
import { VirtuosoHandle } from 'react-virtuoso';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function GuestChatUI({ token, conversation }: { token: string, conversation: any }) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [isSending, setIsSending] = useState(false);
  
  const hasIdentity = !!conversation.guestName || !!conversation.client;
  const [guestName, setGuestName] = useState(conversation.guestName || '');
  const [isJoined, setIsJoined] = useState(hasIdentity);
  const [messages, setMessages] = useState<any[]>(conversation.messages || []);
  const latestMessageDateRef = useRef<Date | string>(
    messages.length > 0 ? messages[messages.length - 1].createdAt : conversation.createdAt
  );

  useEffect(() => {
    if (messages.length > 0) {
      latestMessageDateRef.current = messages[messages.length - 1].createdAt;
    }
  }, [messages]);

  // Real-time via Ably WebSockets
  useEffect(() => {
    if (!isJoined) return;
    
    let isSubscribed = true;
    let clientRef: any = null;
    let channelRef: any = null;
    let onMessageRef: any = null;
    
    // We import ably dynamically so it doesn't break SSR
    import('ably').then((Ably) => {
      if (!isSubscribed) return;
      
      clientRef = new Ably.Realtime({ 
        authUrl: `/api/ably/auth-guest?guestToken=${token}` 
      });
      
      const channelName = `conversation-${conversation.id}`;
      channelRef = clientRef.channels.get(channelName);
      
      onMessageRef = (message: any) => {
        const newMsg = message.data;
        setMessages(prev => {
          // Prevent duplicates (e.g. from optimistic updates)
          if (prev.some(pm => pm.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      };
      
      channelRef.subscribe('new-message', onMessageRef);
      
      // We still do one initial fetch just in case we missed messages before WebSocket connected
      getNewGuestMessages(token, new Date(latestMessageDateRef.current)).then(res => {
        if (!isSubscribed) return;
        if (res.success && res.messages && res.messages.length > 0) {
          setMessages(prev => {
            const newMsgs = res.messages.filter((nm: any) => !prev.some(pm => pm.id === nm.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
        }
      }).catch(() => {});
    });
    
    return () => {
      isSubscribed = false;
      if (channelRef && onMessageRef) {
        channelRef.unsubscribe('new-message', onMessageRef);
      }
      if (clientRef) {
        clientRef.close();
      }
    };
  }, [isJoined, token, conversation.id]);



  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
      setIsSending(true);
      try {
        await saveGuestName(token, guestName);
        setIsJoined(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleSend = async (text: string) => {
    setIsSending(true);

    try {
      const res = await sendGuestMessage(token, text, guestName);
      if (!res.success || !res.message) {
        throw new Error('Failed to send');
      }
    } catch (err) {
      console.error(err);
      // Ideally show a toast here
    } finally {
      setIsSending(false);
    }
  };

  if (!isJoined) {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="flex flex-col items-center justify-center h-full p-6">
          <div className="w-full max-w-sm bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold mb-2">Welcome to {conversation.business.name}</h2>
            <p className="text-sm text-zinc-500 mb-6">Please enter your name to start chatting.</p>
            
            <form onSubmit={handleJoin} className="space-y-4">
              <Input 
                placeholder="Your Name" 
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                autoFocus
                className="text-center"
              />
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Start Chat
              </Button>
            </form>
          </div>
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-950/50">
      <ThreadHeader
        conversation={conversation}
        currentUserId={null}
        isAdmin={false}
        isUpdatingSlowMode={false}
        updateSlowMode={() => {}}
      />

      <MessageList
        messages={messages}
        currentUserId={null}
        conversation={conversation}
        isAdmin={false}
        virtuosoRef={virtuosoRef}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={() => {}}
        onDeleteMessage={() => {}}
      />

      <MessageComposer
        onSend={handleSend}
        isSending={isSending}
        cooldownRemaining={0}
        isBroadcast={false}
        isAdmin={false}
        scrollToBottom={() => virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior: 'smooth' })}
      />
    </div>
    </QueryClientProvider>
  );
}
