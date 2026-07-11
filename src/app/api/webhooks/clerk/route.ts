import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'

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
      const { id, name } = evt.data
      
      await prisma.business.upsert({
        where: { id },
        update: { name },
        create: {
          id,
          name,
          defaultCurrency: 'USD'
        }
      })
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
        await prisma.user.delete({
          where: { id }
        })
      }
    }

    if (eventType === 'organization.deleted') {
      const { id } = evt.data
      if (id) {
        await prisma.business.delete({
          where: { id }
        })
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
