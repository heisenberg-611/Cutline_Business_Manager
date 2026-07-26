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
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Chat Link Expired</h1>
        <p className="text-zinc-500">This chat box has expired or been deleted by the business.</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border-x border-zinc-200 dark:border-zinc-800 flex flex-col h-screen">
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
