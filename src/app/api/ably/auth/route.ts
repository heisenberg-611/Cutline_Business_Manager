import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as Ably from 'ably';
import { businessNamespace } from '@/lib/ably/channels';

export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Without an organization there is no namespace to scope the token to, and an
  // unscoped token inherits the API key's full rights.
  if (!orgId) {
    return NextResponse.json({ error: 'No active organization' }, { status: 403 });
  }

  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing ABLY_API_KEY' }, { status: 500 });
  }

  const client = new Ably.Rest(apiKey);

  try {
    const tokenRequestData = await client.auth.createTokenRequest({
      clientId: userId,
      // Restrict the token to this business's namespace. Omitting `capability`
      // grants everything the API key can do, which let any signed-in user
      // subscribe to another tenant's channels and read their messages.
      //
      // Subscribe only: publishing happens server-side through the REST client,
      // so a browser token never needs publish rights.
      capability: JSON.stringify({
        [businessNamespace(orgId)]: ['subscribe'],
      }),
    });
    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error creating Ably token request:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
