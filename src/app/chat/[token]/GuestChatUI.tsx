'use client';

import { useState, useEffect, useRef } from 'react';
import { sendGuestMessage, getNewGuestMessages } from '@/modules/messaging/guest-actions';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageList } from '@/modules/messaging/components/thread/MessageList';
import { ThreadHeader } from '@/modules/messaging/components/thread/ThreadHeader';
import { MessageComposer } from '@/modules/messaging/components/thread/MessageComposer';
import { VirtuosoHandle } from 'react-virtuoso';

export function GuestChatUI({ token, conversation }: { token: string, conversation: any }) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [isSending, setIsSending] = useState(false);
  
  const hasIdentity = !!conversation.guestName || !!conversation.client;
  const [guestName, setGuestName] = useState(conversation.guestName || '');
  const [isJoined, setIsJoined] = useState(hasIdentity);
  const [messages, setMessages] = useState<any[]>(conversation.messages || []);

  // Poll for new messages every 5 seconds (lightweight, no full page reload)
  useEffect(() => {
    if (!isJoined) return;
    
    const interval = setInterval(async () => {
      if (document.hidden) return;
      const afterDate = messages.length > 0 ? messages[messages.length - 1].createdAt : conversation.createdAt;
      
      try {
        const res = await getNewGuestMessages(token, afterDate);
        if (res.success && res.messages && res.messages.length > 0) {
          setMessages(prev => {
            const newMsgs = res.messages.filter((nm: any) => !prev.some(pm => pm.id === nm.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
        }
      } catch (err) {
        // Silent fail
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isJoined, token, messages, conversation.createdAt]);



  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
      setIsJoined(true);
    }
  };

  const handleSend = async (text: string) => {
    setIsSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      isGuest: true,
      senderId: null,
      isOptimistic: true
    };
    
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await sendGuestMessage(token, text, guestName);
      if (res.success && res.message) {
        setMessages(prev => prev.map(m => m.id === tempId ? res.message : m));
      } else {
        throw new Error('Failed to send');
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  if (!isJoined) {
    return (
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
    );
  }

  return (
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
  );
}
