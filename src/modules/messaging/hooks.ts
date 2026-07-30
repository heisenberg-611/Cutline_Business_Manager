'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useAblyClient } from './components/AblyProvider'
import { 
  getConversations, 
  getMessages, 
  sendMessage, 
  markConversationRead,
  updateSlowMode
} from './actions'


import { useAuth } from '@clerk/nextjs'

/**
 * Polls the conversation list every 15 seconds to keep unread counts fresh.
 */
export function useConversations() {
  const ably = useAblyClient();
  const { orgId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations(),
  })

  // Real-time global sidebar updates
  useEffect(() => {
    if (!orgId || !ably) return;

    const channelName = `business-${orgId}`;
    const channel = ably.channels.get(channelName);

    const onSidebarUpdate = (message: any) => {
      const data = message.data; // { conversationId, message, timestamp }
      
      queryClient.setQueryData(['conversations'], (oldConvs: any[]) => {
        if (!oldConvs) return oldConvs;
        
        let found = false;
        const updated = oldConvs.map(conv => {
          if (conv.id === data.conversationId) {
            found = true;
            return {
              ...conv,
              lastActivity: data.timestamp,
              messages: [data.message]
            };
          }
          return conv;
        });

        // If it's a new conversation not in our list, we should ideally refetch, 
        // but sorting what we have is good enough for now.
        if (!found) {
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          return oldConvs;
        }

        return updated.sort((a, b) => {
          if (a.type === 'BROADCAST' && b.type !== 'BROADCAST') return -1;
          if (b.type === 'BROADCAST' && a.type !== 'BROADCAST') return 1;
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        });
      });
    };

    channel.subscribe('sidebar-update', onSidebarUpdate);

    return () => {
      channel.unsubscribe('sidebar-update', onSidebarUpdate);
    };
  }, [orgId, ably, queryClient]);

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

  const ably = useAblyClient();

  // Real-time via Ably WebSockets
  useEffect(() => {
    if (!conversationId || !ably) return;
    
    const channelName = `conversation-${conversationId}`;
    const channel = ably.channels.get(channelName);
    
      const onMessage = (message: any) => {
        const newMsg = message.data;
        console.log('Admin received Ably message:', newMsg);
        
        queryClient.setQueryData(['messages', conversationId], (old: any) => {
          if (!old || !old.pages) return old;
          
          // Check if message already exists
          const exists = old.pages.some((p: any) => 
            p.messages.some((m: any) => m.id === newMsg.id)
          );
          if (exists) return old;

          const newPages = [...old.pages];
          
          // Anti-jitter: If Ably delivers our own message before the API resolves, swap the temp message!
          if (newMsg.senderId === currentUserId) {
            const optimisticIndex = newPages[0].messages.findIndex((m: any) => m.isOptimistic && m.content === newMsg.content);
            if (optimisticIndex !== -1) {
              const nextMessages = [...newPages[0].messages];
              nextMessages[optimisticIndex] = newMsg;
              newPages[0] = { ...newPages[0], messages: nextMessages };
              return { ...old, pages: newPages };
            }
          }

          newPages[0] = {
            ...newPages[0],
            messages: [...newPages[0].messages, newMsg]
          };
          return { ...old, pages: newPages };
        });
      };

    channel.subscribe('new-message', onMessage);

    return () => {
      channel.unsubscribe('new-message', onMessage);
    };
  }, [conversationId, ably, queryClient, currentUserId]);

  // Mutation to send a message optimistically
  const sendMutation = useMutation({
    mutationFn: (content: string) => {
      if (!conversationId) throw new Error('No active conversation')
      return sendMessage(conversationId, content)
    },
    onMutate: async (content: string) => {
      if (!conversationId) return

      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] })
      const previousMessages = queryClient.getQueryData<any>(['messages', conversationId])
      const tempId = `temp-${Date.now()}`;

      // Optimistically update messages
      if (previousMessages && previousMessages.pages && previousMessages.pages.length > 0) {
        const optimisticMessage = {
          id: tempId,
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

      return { previousMessages, tempId }
    },
    onSuccess: (realMessage, variables, context) => {
      if (!realMessage) return;
      // Replace the temp message with the real one, unless Ably already delivered it
      queryClient.setQueryData(['messages', conversationId], (old: any) => {
        if (!old || !old.pages) return old;
        const newPages = [...old.pages];
        
        const ablyAlreadyDelivered = newPages.some(p => p.messages.some((m: any) => m.id === realMessage.id));
        
        newPages[0] = {
          ...newPages[0],
          messages: ablyAlreadyDelivered 
            ? newPages[0].messages.filter((m: any) => m.id !== context?.tempId)
            : newPages[0].messages.map((m: any) => m.id === context?.tempId ? realMessage : m)
        };
        return { ...old, pages: newPages };
      });
    },
    onError: (err, newContent, context) => {
      console.error('Failed to send message:', err)
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId], context.previousMessages)
      }
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
