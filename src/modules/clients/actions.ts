'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/modules/core/db/prisma'

// -----------------------------------------------------------------------------
// DUPLICATE CHECK QUERIES (for live form validation)
// -----------------------------------------------------------------------------

export async function checkClientEmailExists(email: string, excludeClientId?: string): Promise<{ exists: boolean; clientName?: string }> {
  const { orgId } = await auth()
  if (!orgId || !email || email.trim() === '') return { exists: false }

  const existing = await prisma.client.findFirst({
    where: {
      businessId: orgId,
      email: { equals: email.trim(), mode: 'insensitive' },
      ...(excludeClientId ? { id: { not: excludeClientId } } : {})
    },
    select: { displayName: true }
  })

  return existing ? { exists: true, clientName: existing.displayName } : { exists: false }
}

// -----------------------------------------------------------------------------
// MUTATIONS
// -----------------------------------------------------------------------------

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

  // Duplicate email check
  const emailStr = email ? email.toString().trim() : ''
  if (emailStr) {
    const { exists, clientName } = await checkClientEmailExists(emailStr)
    if (exists) {
      throw new Error(`A client with email "${emailStr}" already exists (${clientName}). Please use a different email.`)
    }
  }

  const business = await prisma.business.update({
    where: { id: orgId },
    data: { clientSequence: { increment: 1 } },
    select: { clientSequence: true }
  })
  const displayId = `CL-${String(business.clientSequence).padStart(3, '0')}`

  await prisma.client.create({
    data: {
      businessId: orgId,
      displayId,
      displayName: displayName.toString(),
      companyName: companyName ? companyName.toString() : null,
      email: emailStr || null,
      phone: phone ? phone.toString() : null,
      industry: industry ? industry.toString() : null,
      preferredChannel: preferredChannel ? preferredChannel.toString() : null,
      internalRating: 5 // Default 5 stars
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

  // Duplicate email pre-check (if email changed)
  const emailStr = data.email ? data.email.trim() : ''
  if (emailStr && emailStr !== client.email) {
    const { exists, clientName } = await checkClientEmailExists(emailStr, clientId)
    if (exists) {
      throw new Error(`A client with email "${emailStr}" already exists (${clientName}). Please use a different email.`)
    }
  }

  try {
    await prisma.client.update({
      where: { id: clientId, businessId: orgId },
      data
    })
  } catch (err: any) {
    // Fallback: catch TOCTOU race on @@unique([businessId, email])
    if (err.code === 'P2002') {
      throw new Error(`A client with this email already exists. Please use a different email.`)
    }
    throw err
  }

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

  await prisma.client.deleteMany({
    where: { id: clientId, businessId: orgId }
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
    where: { id: clientId, businessId: orgId },
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
