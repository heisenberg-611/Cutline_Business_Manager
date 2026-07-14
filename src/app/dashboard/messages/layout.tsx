import { MessagingQueryProvider } from '@/modules/messaging/components/QueryProvider'
import { MessagingSidebar } from '@/modules/messaging/components/MessagingSidebar'
import { auth } from '@clerk/nextjs/server'

export const metadata = {
  title: 'Messages',
}

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const { userId, orgRole } = await auth()
  
  if (!userId) return null

  return (
    <MessagingQueryProvider>
      <div className="flex h-[calc(100vh-8rem)] bg-background border rounded-xl overflow-hidden shadow-sm">
        <MessagingSidebar currentUserId={userId} isAdmin={orgRole === 'org:admin'} />
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </div>
    </MessagingQueryProvider>
  )
}
