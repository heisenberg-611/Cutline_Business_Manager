'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getConversations, 
  getMessages, 
  getNewMessages,
  sendMessage, 
  markConversationRead 
} from './actions'

/**
 * Polls the conversation list every 15 seconds to keep unread counts fresh.
 */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations(),
    refetchInterval: 15000, // 15 seconds
  })
}

/**
 * Polls active conversation messages every 5 seconds using delta fetching.
 */
export function useConversationMessages(conversationId: string | null) {
  const queryClient = useQueryClient()
  
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return null
      
      const currentData = queryClient.getQueryData<{messages: any[], nextCursor?: string}>(['messages', conversationId])
      
      // If we have cached messages, only fetch the new ones
      if (currentData && currentData.messages && currentData.messages.length > 0) {
        const latestMessage = currentData.messages[currentData.messages.length - 1]
        try {
          const newMessages = await getNewMessages(conversationId, latestMessage.createdAt)
          if (newMessages.length > 0) {
            return {
              messages: [...currentData.messages, ...newMessages],
              nextCursor: currentData.nextCursor
            }
          }
          return currentData
        } catch (e) {
          // If delta fetch fails, fallback to standard fetch
          return getMessages(conversationId)
        }
      }
      
      // No cache, fetch initial page
      return getMessages(conversationId)
    },
    refetchInterval: 5000, // 5 seconds (only when open)
    enabled: !!conversationId
  })

  // Mutation to send a message optimistically or invalidate
  const sendMutation = useMutation({
    mutationFn: (content: string) => {
      if (!conversationId) throw new Error('No active conversation')
      return sendMessage(conversationId, content)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: () => {
      if (!conversationId) return Promise.resolve(null)
      return markConversationRead(conversationId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })

  return {
    messages: query.data?.messages || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    markAsRead: markReadMutation.mutate
  }
}
