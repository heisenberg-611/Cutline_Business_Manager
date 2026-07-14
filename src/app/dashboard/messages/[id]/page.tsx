import { ThreadView } from '@/modules/messaging/components/ThreadView'
import { auth } from '@clerk/nextjs/server'

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const { userId, orgRole } = await auth()
  if (!userId) return null

  // Unwrap params for Next.js 15+ compatibility
  const resolvedParams = await params

  return <ThreadView conversationId={resolvedParams.id} currentUserId={userId} isAdmin={orgRole === 'org:admin'} />
}
