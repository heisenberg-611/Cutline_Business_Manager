'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/modules/core/db/prisma'

export async function createClient(data: FormData) {
  const { orgId } = await auth()
  
  if (!orgId) {
    throw new Error('Unauthorized: No active business selected.')
  }

  const displayName = data.get('displayName') as String
  const companyName = data.get('companyName') as String
  const email = data.get('email') as String
  const phone = data.get('phone') as String
  const industry = data.get('industry') as String
  const preferredChannel = data.get('preferredChannel') as String

  if (!displayName || displayName.trim() === '') {
    throw new Error('Display Name is required')
  }

  await prisma.client.create({
    data: {
      businessId: orgId,
      displayName: displayName.toString(),
      companyName: companyName ? companyName.toString() : null,
      email: email ? email.toString() : null,
      phone: phone ? phone.toString() : null,
      industry: industry ? industry.toString() : null,
      preferredChannel: preferredChannel ? preferredChannel.toString() : null,
      internalRating: 3 // Default 3 stars
    }
  })

  revalidatePath('/dashboard/clients')
}

export async function updateClient(clientId: string, data: { displayName: string, companyName: string, email?: string, phone?: string, industry: string, preferredChannel: string }) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  // Verify ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId: orgId }
  })
  if (!client) throw new Error('Client not found')

  await prisma.client.update({
    where: { id: clientId },
    data
  })

  revalidatePath('/dashboard/clients')
}

export async function deleteClient(clientId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  // Verify ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId: orgId }
  })
  if (!client) throw new Error('Client not found')

  await prisma.client.delete({
    where: { id: clientId }
  })

  revalidatePath('/dashboard/clients')
}

export async function updateClientRating(clientId: string, rating: number) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  // Validate rating
  if (rating < 0 || rating > 5) {
    throw new Error('Rating must be between 0 and 5')
  }

  // Verify ownership
  const client = await prisma.client.findFirst({
    where: { id: clientId, businessId: orgId }
  })
  if (!client) throw new Error('Client not found')

  await prisma.client.update({
    where: { id: clientId },
    data: { internalRating: rating }
  })

  revalidatePath('/dashboard/clients')
}

export async function getClients(orgId: string) {
  if (!orgId) {
    return []
  }

  return await prisma.client.findMany({
    where: {
      businessId: orgId
    },
    orderBy: [
      { internalRating: 'desc' },
      { createdAt: 'desc' }
    ]
  })
}
