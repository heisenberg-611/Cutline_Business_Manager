import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as Ably from 'ably';

export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ABLY_API_KEY' }, { status: 500 });
  }

  const client = new Ably.Rest(apiKey);

  try {
    const tokenRequestData = await client.auth.createTokenRequest({
      clientId: userId,
    });
    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error creating Ably token request:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
