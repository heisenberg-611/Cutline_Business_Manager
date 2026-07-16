'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { 
  getConversations, 
  getMessages, 
  getNewMessages,
  sendMessage, 
  markConversationRead,
  updateSlowMode
} from './actions'
import { useMessagingConfig } from './components/QueryProvider'

/**
 * Polls the conversation list every 15 seconds to keep unread counts fresh.
 */
export function useConversations() {
  const { realtimeEnabled } = useMessagingConfig()

  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations(),
    refetchInterval: realtimeEnabled ? 15000 : false, // 15 seconds or manual
  })

  return {
    ...query,
    conversations: query.data || [],
  }
}

/**
 * Polls active conversation messages every 5 seconds using delta fetching.
 */
export function useConversationMessages(conversationId: string | null, currentUserId?: string) {
  const queryClient = useQueryClient()
  const { realtimeEnabled } = useMessagingConfig()
  
  const query = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }) => {
      if (!conversationId) return { messages: [], nextCursor: undefined }
      return getMessages(conversationId, pageParam as string | undefined)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextCursor || undefined,
    enabled: !!conversationId
  })

  // Real-time polling
  useEffect(() => {
    if (!realtimeEnabled || !conversationId) return
    
    const interval = setInterval(async () => {
      const currentData = queryClient.getQueryData<any>(['messages', conversationId])
      if (!currentData || !currentData.pages || currentData.pages.length === 0) return
      
      // Page 0 contains the newest messages
      const firstPage = currentData.pages[0]
      if (!firstPage.messages || firstPage.messages.length === 0) return
      
      const realMessages = firstPage.messages.filter((m: any) => !m.isOptimistic)
      if (realMessages.length === 0) return
      
      const latestMessage = realMessages[realMessages.length - 1]
      try {
        const newMessages = await getNewMessages(conversationId, latestMessage.createdAt)
        if (newMessages.length > 0) {
          queryClient.setQueryData(['messages', conversationId], (old: any) => {
            if (!old || !old.pages) return old
            const newPages = [...old.pages]
            newPages[0] = {
              ...newPages[0],
              messages: [...newPages[0].messages, ...newMessages.filter((m: any) => !m.isOptimistic)]
            }
            return { ...old, pages: newPages }
          })
        }
      } catch (e) {
        // ignore
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [realtimeEnabled, conversationId, queryClient])

  // Mutation to send a message optimistically or invalidate
  const sendMutation = useMutation({
    mutationFn: (content: string) => {
      if (!conversationId) throw new Error('No active conversation')
      return sendMessage(conversationId, content)
    },
    onMutate: async (content: string) => {
      if (!conversationId) return

      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] })
      await queryClient.cancelQueries({ queryKey: ['conversations'] })

      const previousMessages = queryClient.getQueryData<any>(['messages', conversationId])
      const previousConversations = queryClient.getQueryData<any[]>(['conversations'])

      // Optimistically update messages
      if (previousMessages && previousMessages.pages && previousMessages.pages.length > 0) {
        const optimisticMessage = {
          id: `temp-${Date.now()}`,
          conversationId,
          senderId: currentUserId || 'optimistic',
          content,
          createdAt: new Date(),
          sender: null,
          isOptimistic: true
        }
        
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
          if (!old) return old
          const newPages = [...old.pages]
          newPages[0] = {
            ...newPages[0],
            messages: [...newPages[0].messages, optimisticMessage]
          }
          return { ...old, pages: newPages }
        })
      }

      // Optimistically update conversations list (sidebar)
      if (previousConversations) {
        queryClient.setQueryData(['conversations'], previousConversations.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              lastActivity: new Date(),
              messages: [{
                id: `temp-${Date.now()}`,
                content,
                createdAt: new Date()
              }]
            }
          }
          return conv
        }).sort((a, b) => {
          if (a.type === 'BROADCAST' && b.type !== 'BROADCAST') return -1;
          if (b.type === 'BROADCAST' && a.type !== 'BROADCAST') return 1;
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        }))
      }

      return { previousMessages, previousConversations }
    },
    onError: (err, newContent, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId], context.previousMessages)
      }
      if (context?.previousConversations) {
        queryClient.setQueryData(['conversations'], context.previousConversations)
      }
    },
    onSettled: () => {
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

  const updateSlowModeMutation = useMutation({
    mutationFn: ({ enabled, cooldown }: { enabled: boolean, cooldown: number }) => {
      if (!conversationId) throw new Error('No active conversation')
      return updateSlowMode(conversationId, enabled, cooldown)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })

  // Flatten pages but in reverse order so oldest pages come first
  const flatMessages = useMemo(() => {
    return query.data?.pages 
      ? [...query.data.pages].reverse().flatMap(page => page.messages || []) 
      : []
  }, [query.data?.pages])

  return {
    messages: flatMessages,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
    markAsRead: markReadMutation.mutate,
    updateSlowMode: updateSlowModeMutation.mutate,
    isUpdatingSlowMode: updateSlowModeMutation.isPending
  }
}
