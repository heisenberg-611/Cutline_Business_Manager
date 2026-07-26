'use server';

import prisma from '@/modules/core/db/prisma';

export async function getGuestChatByToken(token: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { guestToken: token },
    include: {
      business: { select: { name: true, id: true } },
      client: { select: { displayName: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: { select: { firstName: true, lastName: true, imageUrl: true } }
        }
      }
    }
  });
  
  if (!conversation) return { success: false, error: 'Chat not found' };
  
  return { success: true, conversation };
}

export async function getNewGuestMessages(token: string, afterDate: Date) {
  const messages = await prisma.message.findMany({
    where: { 
      conversation: { guestToken: token },
      createdAt: { gt: afterDate }
    },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { firstName: true, lastName: true, imageUrl: true } }
    }
  });

  return { success: true, messages };
}

export async function sendGuestMessage(token: string, content: string, guestName?: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { guestToken: token }
  });
  
  if (!conversation) return { success: false, error: 'Chat not found' };
  
  // Update guestName on the conversation if provided and not yet set
  if (guestName && !conversation.guestName) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { guestName }
    });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      content,
      isGuest: true,
      senderId: null
    }
  });

  return { success: true, message };
}
