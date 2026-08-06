import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as Ably from 'ably';
import prisma from '@/modules/core/db/prisma';
import {
  allProjectCollabChannels,
  conversationChannel,
  pipelineChannel,
  projectCollabChannel,
  userNotificationsChannel,
  userSidebarChannel,
} from '@/lib/ably/channels';
import { visibleProjectFilter } from '@/modules/projects/authz';

export async function GET() {
  const { userId, orgId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Without an organization there is nothing to scope the token to, and an
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
    // Conversation access is granted per conversation the user is actually in.
    // A `business:{orgId}:*` wildcard used to cover these, which meant any
    // member could subscribe to any conversation in the organization — direct
    // messages between two other people included. The database side has always
    // checked participation; the realtime side did not.
    //
    // Matches authorizeConversationRead: membership, not deletedAt, is what
    // grants access, since a soft-deleted participant only has their history
    // hidden rather than revoked.
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId, conversation: { businessId: orgId } },
      select: { conversationId: true },
    });

    // Collaboration channels are granted per project the caller can actually
    // read, using the same filter every project list screen uses so realtime
    // visibility cannot drift from page visibility.
    //
    // An admin can read every project, so they get one wildcard entry and no
    // query at all — enumerating them meant a findMany over the whole project
    // table on every auth call, and a capability that grew with the business.
    // A member's list is bounded by the projects they are on.
    const { orgRole } = await auth();
    const isAdmin = orgRole === 'org:admin';

    const readableProjects = isAdmin
      ? []
      : await prisma.project.findMany({
          where: { businessId: orgId, ...visibleProjectFilter(userId) },
          select: { id: true },
        });

    const capability: Record<string, string[]> = {
      // Project stage moves and presence. Org-wide by design: the payload is
      // project ids and stage ids, and each board already filters to the
      // projects its viewer can see.
      [pipelineChannel(orgId)]: ['subscribe', 'presence'],
      // Per user, so one member cannot read another's feed.
      [userNotificationsChannel(userId)]: ['subscribe'],
      [userSidebarChannel(userId)]: ['subscribe'],
    };

    for (const { conversationId } of participations) {
      capability[conversationChannel(orgId, conversationId)] = ['subscribe'];
    }

    if (isAdmin) {
      // presence too: the collaboration page shows who else is looking at it.
      capability[allProjectCollabChannels(orgId)] = ['subscribe', 'presence'];
    } else {
      for (const { id } of readableProjects) {
        capability[projectCollabChannel(orgId, id)] = ['subscribe', 'presence'];
      }
    }

    const tokenRequestData = await client.auth.createTokenRequest({
      clientId: userId,
      // Subscribe + presence only. All publishing happens server-side through
      // the REST client, so a browser token never needs publish rights;
      // presence is separate and must be client-side, since it has to drop when
      // the connection does.
      capability: JSON.stringify(capability),
    });
    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error creating Ably token request:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
