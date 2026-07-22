'use client';

import { useState, useEffect, useRef } from 'react';
import { sendGuestMessage, getNewGuestMessages } from '@/modules/messaging/guest-actions';
import { Send, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function GuestChatUI({ token, conversation }: { token: string, conversation: any }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const hasIdentity = !!conversation.guestName || !!conversation.client;
  const [guestName, setGuestName] = useState(conversation.guestName || '');
  const [isJoined, setIsJoined] = useState(hasIdentity);
  const [messages, setMessages] = useState<any[]>(conversation.messages || []);

  // Poll for new messages every 5 seconds (lightweight, no full page reload)
  useEffect(() => {
    if (!isJoined) return;
    
    const interval = setInterval(async () => {
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

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
      setIsJoined(true);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    const messageContent = content;
    setContent('');
    setIsSending(true);

    try {
      const res = await sendGuestMessage(token, messageContent, guestName);
      if (res.success && res.message) {
        setMessages(prev => [...prev, { ...res.message, isOptimistic: true }]);
      }
    } catch (err) {
      console.error(err);
      // fallback if action fails, restore content
      setContent(messageContent);
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
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 my-10 text-sm">
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((msg: any) => {
            const isMe = msg.isGuest;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-bl-none'
                }`}>
                  {!isMe && msg.sender && (
                    <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                      {msg.sender.firstName} {msg.sender.lastName}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {msg.content}
                  </div>
                  <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-zinc-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-full px-4"
            disabled={isSending}
          />
          <Button 
            type="submit" 
            disabled={!content.trim() || isSending}
            size="icon"
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
