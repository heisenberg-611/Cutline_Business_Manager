import { MessageSquare } from 'lucide-react'

export default function MessagesEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-background">
      <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 opacity-50" />
      </div>
      <h3 className="text-xl font-medium text-foreground mb-2">Your Messages</h3>
      <p className="max-w-sm text-sm">
        Select a conversation from the sidebar or start a new one to begin messaging.
      </p>
    </div>
  )
}
