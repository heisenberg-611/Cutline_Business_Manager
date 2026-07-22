'use server';

import prisma from '@/modules/core/db/prisma';
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';

export async function createGuestChatLink(businessId: string, clientId?: string) {
  const token = uuidv4();
  
  const conversation = await prisma.conversation.create({
    data: {
      businessId,
      type: 'GUEST_LINK',
      guestToken: token,
      clientId: clientId || null,
      createdBy: 'system', // or the userId
      title: 'Support Chat',
    }
  });

  return { success: true, token, conversationId: conversation.id };
}

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
  const conversation = await prisma.conversation.findUnique({
    where: { guestToken: token },
    select: { id: true }
  });
  
  if (!conversation) return { success: false, error: 'Chat not found' };
  
  const messages = await prisma.message.findMany({
    where: { 
      conversationId: conversation.id,
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

  revalidatePath(`/chat/${token}`);
  return { success: true, message };
}
