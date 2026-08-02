import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/modules/core/db/prisma';
import * as Ably from 'ably';
import { conversationChannel } from '@/lib/ably/channels';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const guestToken = searchParams.get('guestToken');

  if (!guestToken) {
    return NextResponse.json({ error: 'Missing guestToken' }, { status: 400 });
  }

  // Validate the guest token
  const conversation = await prisma.conversation.findUnique({
    where: { guestToken },
    select: { id: true, type: true, businessId: true }
  });

  if (!conversation || conversation.type !== 'GUEST_LINK') {
    return NextResponse.json({ error: 'Invalid or expired guest link' }, { status: 401 });
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ABLY_API_KEY' }, { status: 500 });
  }

  const client = new Ably.Rest(apiKey);

  try {
    const tokenRequestData = await client.auth.createTokenRequest({
      clientId: `guest-${guestToken}`,
      // A guest is scoped to the single conversation their link opens — not the
      // business namespace. Previously this token was unscoped, so any valid
      // guest link granted access to every channel on the account.
      capability: JSON.stringify({
        [conversationChannel(conversation.businessId, conversation.id)]: ['subscribe'],
      }),
    });
    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error creating guest Ably token request:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
