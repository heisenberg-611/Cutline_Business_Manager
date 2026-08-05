import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { getActivePlan, canInviteMembers } from '@/lib/subscription'
import { syncClerkSeatCap } from '@/lib/plan-guard'
import { createAdminNotification } from '@/lib/admin-notifications'
import { ORG_DELETION_GRACE_DAYS } from '@/lib/account-deletion'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body exactly as it was sent (raw text) to ensure Svix signatures match
  const body = await req.text()

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  const eventType = evt.type

  try {
    if (eventType === 'organization.created' || eventType === 'organization.updated') {
      const { id, name, created_by } = evt.data

      const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' } });
      const planId = settings?.defaultPlanId || 'FREE';

      const business = await prisma.business.upsert({
        where: { id },
        update: { name },
        create: {
          id,
          name,
          defaultCurrency: 'USD',
          subscriptionPlan: planId as any,
          ownerUserId: created_by || null
        }
      })

      // Fills the owner only when it is still unknown — the membership branch
      // below can create a business row defensively without ever seeing
      // created_by. Scoped to ownerUserId: null so an established owner is
      // never reassigned by a later organization.updated event.
      if (created_by && !business.ownerUserId) {
        await prisma.business.updateMany({
          where: { id, ownerUserId: null },
          data: { ownerUserId: created_by }
        })
        business.ownerUserId = created_by
      }

      // New organizations start capped at the owner's single seat unless the
      // default plan includes team members.
      if (eventType === 'organization.created') {
        await syncClerkSeatCap(id, getActivePlan(business))
      }
    }

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data
      
      // Safety check: ensure email_addresses exists
      let primaryEmail = ''
      if (email_addresses && Array.isArray(email_addresses)) {
        primaryEmail = email_addresses.find((e: any) => e.id === (evt.data as any).primary_email_address_id)?.email_address 
          || email_addresses[0]?.email_address 
          || ''
      }
      
      await prisma.user.upsert({
        where: { id },
        update: {
          email: primaryEmail,
          firstName: first_name || '',
          lastName: last_name || '',
          imageUrl: image_url || ''
        },
        create: {
          id,
          email: primaryEmail,
          firstName: first_name || '',
          lastName: last_name || '',
          imageUrl: image_url || ''
        }
      })
    }

    if (eventType === 'organizationMembership.created' || eventType === 'organizationMembership.updated') {
      const { organization, public_user_data, role } = evt.data
      
      if (public_user_data && public_user_data.user_id) {
        const settings = await prisma.globalSettings.findUnique({ where: { id: 'default' } });
        const planId = settings?.defaultPlanId || 'FREE';

        // Defensively ensure parent rows exist — Clerk doesn't guarantee webhook ordering
        const business = await prisma.business.upsert({
          where: { id: organization.id },
          update: {},
          create: {
            id: organization.id,
            name: organization.name || `Business ${organization.id}`,
            defaultCurrency: 'USD',
            subscriptionPlan: planId as any
          }
        })

        // The owner's role is not another admin's to take. Clerk has no notion
        // of an owner beyond created_by, so any org:admin can demote any other
        // — including the person whose workspace it is. Combined with an admin's
        // ability to delete the organization outright, that is a complete
        // takeover, so the demotion is reversed rather than merely recorded.
        if (
          eventType === 'organizationMembership.updated' &&
          business.ownerUserId === public_user_data.user_id &&
          role !== 'org:admin'
        ) {
          console.warn(
            '[clerk-webhook] Restoring owner %s demoted to %s in %s',
            public_user_data.user_id,
            role,
            organization.id
          )

          try {
            const { clerkClient } = await import('@clerk/nextjs/server')
            const client = await clerkClient()
            await client.organizations.updateOrganizationMembership({
              organizationId: organization.id,
              userId: public_user_data.user_id,
              role: 'org:admin',
            })
          } catch (restoreError) {
            console.error('[clerk-webhook] Could not restore owner role:', restoreError)
          }

          await createAdminNotification({
            title: 'Workspace owner was demoted',
            message: `Someone tried to remove admin rights from the owner of ${organization.name || organization.id}. The role has been restored.`,
            type: 'security',
            actionUrl: '/hq/organizations',
          })

          // Restoring triggers a fresh webhook carrying org:admin, which writes
          // the correct role. Recording the demotion here would race with it.
          return new Response(
            JSON.stringify({ success: true, restored: 'owner_role' }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        }

        // Seat backstop. The Clerk-side cap is the primary control, but it is
        // set by a separate API call that can fail or be missed on a plan path
        // added later — and an invite never touches this app, so this webhook
        // is the last point at which an over-seat membership can be caught.
        //
        // Only brand-new memberships are policed: an existing row means this is
        // a role change (or a webhook retry), and revoking on those would eject
        // legitimate members. Members already present when a plan lapses are
        // deliberately left alone here and handled by the seat lock instead, so
        // that re-upgrading restores the team rather than requiring re-invites.
        const existingMembership = await prisma.businessMembership.findUnique({
          where: {
            businessId_userId: {
              businessId: organization.id,
              userId: public_user_data.user_id
            }
          },
          select: { userId: true }
        })

        if (!existingMembership && !canInviteMembers(getActivePlan(business))) {
          // The owner always keeps their seat. Where the owner is not yet known
          // — a business row created defensively below, or one predating the
          // column and not yet backfilled — fall back to "is anyone here yet",
          // which identifies the founding membership on a brand-new org.
          const isOwnerSeat = business.ownerUserId
            ? business.ownerUserId === public_user_data.user_id
            : (await prisma.businessMembership.count({
                where: { businessId: organization.id }
              })) === 0

          if (!isOwnerSeat) {
            console.warn(
              '[clerk-webhook] Revoking over-seat membership: user %s joined %s on the %s plan',
              public_user_data.user_id,
              organization.id,
              business.subscriptionPlan
            )

            let revoked = false
            try {
              const { clerkClient } = await import('@clerk/nextjs/server')
              const client = await clerkClient()
              await client.organizations.deleteOrganizationMembership({
                organizationId: organization.id,
                userId: public_user_data.user_id
              })
              revoked = true
            } catch (revokeError) {
              // Deliberately swallowed. Letting this reach the outer handler
              // would return a 500 and Clerk would redeliver the same event
              // indefinitely. Skipping the BusinessMembership upsert below is
              // the part that actually matters: without that row the user has
              // no membership in this app, and the seat lock in the dashboard
              // layout keeps them out even though Clerk still lists them.
              console.error(
                `[clerk-webhook] Could not revoke over-seat membership for ` +
                `${public_user_data.user_id} in ${organization.id}:`,
                revokeError
              )
            }

            // Re-assert the cap: reaching here means it was wrong in Clerk.
            await syncClerkSeatCap(organization.id, getActivePlan(business))

            return new Response(
              JSON.stringify({ success: true, revoked: revoked ? 'over_seat_limit' : 'membership_denied' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
        }

        await prisma.user.upsert({
          where: { id: public_user_data.user_id },
          update: {},
          create: {
            id: public_user_data.user_id,
            email: public_user_data.identifier || '',
            firstName: public_user_data.first_name || '',
            lastName: public_user_data.last_name || ''
          }
        })

        await prisma.businessMembership.upsert({
          where: {
            businessId_userId: {
              businessId: organization.id,
              userId: public_user_data.user_id
            }
          },
          update: {
            role
          },
          create: {
            businessId: organization.id,
            userId: public_user_data.user_id,
            role
          }
        })
      }
    }

    if (eventType === 'organizationMembership.deleted') {
      const { organization, public_user_data } = evt.data

      if (public_user_data && public_user_data.user_id) {
        const business = await prisma.business.findUnique({
          where: { id: organization.id },
          select: { ownerUserId: true, name: true, pendingDeletionAt: true },
        })

        // The owner cannot be ejected from their own workspace. Any org:admin
        // can remove any member in Clerk, so without this an admin could remove
        // the owner and take the workspace — the counterpart to demotion, and
        // reached by a different Clerk action.
        //
        // Skipped when the workspace is already being deleted, where every
        // membership is expected to disappear and restoring one would fight the
        // teardown.
        if (
          business?.ownerUserId === public_user_data.user_id &&
          !business.pendingDeletionAt
        ) {
          console.warn(
            '[clerk-webhook] Restoring owner %s removed from %s',
            public_user_data.user_id,
            organization.id
          )

          let restored = false
          try {
            const { clerkClient } = await import('@clerk/nextjs/server')
            const client = await clerkClient()
            await client.organizations.createOrganizationMembership({
              organizationId: organization.id,
              userId: public_user_data.user_id,
              role: 'org:admin',
            })
            restored = true
          } catch (restoreError) {
            console.error('[clerk-webhook] Could not restore owner membership:', restoreError)
          }

          await createAdminNotification({
            title: restored ? 'Workspace owner was removed' : 'Could not restore workspace owner',
            message: restored
              ? `Someone removed the owner of ${business.name} from their own workspace. The membership has been restored.`
              : `The owner of ${business.name} was removed and could NOT be restored — Clerk rejected the attempt. They cannot reach their workspace until they are re-invited.`,
            type: 'security',
            actionUrl: '/hq/organizations',
          })

          if (restored) {
            // The restore raises its own membership.created event, which writes
            // the row back. Deleting it here would race with that.
            return new Response(
              JSON.stringify({ success: true, restored: 'owner_membership' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }

          // Restore failed, so fall through and delete the row. Keeping it would
          // leave this database claiming a membership Clerk does not have — the
          // owner would appear present here while being locked out in reality,
          // and every seat and deletion check would read the wrong answer.
          console.error(
            '[clerk-webhook] Owner %s is now out of sync: removed in Clerk, not restored',
            public_user_data.user_id
          )
        }

        await prisma.businessMembership.deleteMany({
          where: {
            businessId: organization.id,
            userId: public_user_data.user_id
          }
        })
      }
    }

    if (eventType === 'user.deleted') {
      const { id } = evt.data
      if (id) {
        await prisma.user.deleteMany({
          where: { id }
        })
      }
    }

    if (eventType === 'organization.deleted') {
      const { id } = evt.data
      if (id) {
        // Marked, not destroyed. Any org:admin can delete an organization from
        // Clerk's own UI, which reaches none of the account-deletion flow — no
        // export, no stated reason, no confirmation of the terms. Deleting here
        // made that single click irreversible for every client, project and
        // invoice in the workspace.
        //
        // Retaining the rows is safe: without a Clerk organization there is no
        // session that can reach this workspace, so nothing is exposed by the
        // delay. The purge runs from the scheduled job once the grace period
        // has passed.
        const business = await prisma.business.findUnique({
          where: { id },
          select: { name: true, pendingDeletionAt: true },
        })

        if (business && !business.pendingDeletionAt) {
          await prisma.business.update({
            where: { id },
            data: { pendingDeletionAt: new Date() },
          })

          await createAdminNotification({
            title: 'Workspace deleted in Clerk',
            message: `${business.name} was deleted from Clerk. Its data is held for ${ORG_DELETION_GRACE_DAYS} days before being purged, and can still be recovered until then.`,
            type: 'security',
            actionUrl: '/hq/organizations',
          })
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (error: any) {
    console.error('Webhook Database Error:', error)
    return new Response(JSON.stringify({ error: error.message || 'Unknown Database Error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
