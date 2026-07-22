import { getGuestChatByToken } from '@/modules/messaging/guest-actions';
import { notFound } from 'next/navigation';
import { GuestChatUI } from './GuestChatUI';

export const metadata = {
  title: 'Client Chat',
};

export default async function GuestChatPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await getGuestChatByToken(token);
  
  if (!res.success || !res.conversation) {
    return notFound();
  }
  
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-x border-zinc-200 dark:border-zinc-800 flex flex-col h-screen">
        {/* Header */}
        <header className="flex-none p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center bg-white dark:bg-zinc-900 z-10 shadow-sm">
          <div className="flex-1">
            <h1 className="font-bold text-lg text-zinc-900 dark:text-white">
              {res.conversation.business.name}
            </h1>
            <p className="text-sm text-zinc-500">Support & Feedback Chat</p>
          </div>
        </header>
        
        {/* Chat UI Client Component */}
        <div className="flex-1 overflow-hidden relative">
          <GuestChatUI 
            token={token} 
            conversation={res.conversation} 
          />
        </div>
      </div>
    </div>
  );
}
