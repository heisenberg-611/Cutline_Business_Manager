'use server'

import prisma from '@/modules/core/db/prisma'
import { randomBytes } from 'crypto'
import { withUniqueToken } from '@/lib/utils/unique-token'
import { createNotification, broadcastNotification } from '@/modules/notifications/services'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/utils/rate-limit'

const IntakeFormSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(100),
  clientEmail: z.string().email('Invalid email address').max(100),
  companyName: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  industry: z.string().max(100).optional(),
  preferredChannel: z.string().max(50).optional(),
  projectTitle: z.string().min(1, 'Project title is required').max(100),
  projectType: z.string().max(50).optional(),
  scriptText: z.string().max(10000).optional(),
  scriptLink: z.string().max(500).optional(),
  rawFootageLink: z.string().max(500).optional()
})

const ReviewNotesSchema = z.object({
  notes: z.string().max(10000),
  links: z.string().max(1000)
})

export async function submitIntakeForm(businessId: string, data: {
  clientName: string,
  clientEmail: string,
  companyName?: string,
  phone?: string,
  industry?: string,
  preferredChannel?: string,
  projectTitle: string,
  projectType: string,
  scriptText: string,
  scriptLink: string,
  rawFootageLink: string
}) {
  await checkRateLimit()
  const validatedData = IntakeFormSchema.parse(data)

  // Create a ProjectRequest instead of directly creating a Client/Project
  const request = await prisma.projectRequest.create({
    data: {
      businessId,
      clientName: validatedData.clientName,
      clientEmail: validatedData.clientEmail.toLowerCase(),
      companyName: validatedData.companyName || null,
      phone: validatedData.phone || null,
      industry: validatedData.industry || null,
      preferredChannel: validatedData.preferredChannel || null,
      projectTitle: validatedData.projectTitle,
      projectType: validatedData.projectType || null,
      scriptText: validatedData.scriptText || null,
      scriptLink: validatedData.scriptLink || null,
      rawFootageLink: validatedData.rawFootageLink || null,
    }
  })

  // Notify business members about the new request
  try {
    await broadcastNotification({
      businessId,
      title: "New Project Request",
      message: `${validatedData.clientName} submitted a new project request: "${validatedData.projectTitle}". Awaiting your approval.`,
      type: "project",
      actionUrl: `/dashboard/pipeline?view=board`
    })
  } catch (err) {
    console.error("Notification failed", err)
  }

  return { success: true, requestId: request.id }
}

export async function getPendingProjectRequests() {
  const { orgId } = await auth()
  if (!orgId) return []

  const requests = await prisma.projectRequest.findMany({
    where: { businessId: orgId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
  })

  // Check if client exists for each request
  const enrichedRequests = await Promise.all(requests.map(async (req) => {
    const existingClient = await prisma.client.findFirst({
      where: { businessId: orgId, email: req.clientEmail }
    })
    return {
      ...req,
      existingClient: existingClient ? { id: existingClient.id, displayName: existingClient.displayName } : null
    }
  }))

  return enrichedRequests
}

export async function approveProjectRequest(requestId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const request = await prisma.projectRequest.findFirst({
    where: { id: requestId, businessId: orgId, status: 'PENDING' }
  })
  if (!request) throw new Error('Request not found or already resolved')

  // Find default workflow stage
  const template = await prisma.workflowTemplate.findFirst({
    where: { businessId: orgId },
    include: { stages: { orderBy: { orderIndex: 'asc' } } }
  })
  const firstStage = template?.stages[0]

  // All writes in a single transaction
  const { client, project } = await prisma.$transaction(async (tx) => {
    // Find or create client
    let client = await tx.client.findFirst({
      where: { businessId: orgId, email: request.clientEmail }
    })

    if (!client) {
      const business = await tx.business.update({
        where: { id: orgId },
        data: { clientSequence: { increment: 1 } },
        select: { clientSequence: true }
      })
      const displayId = `CL-${String(business.clientSequence).padStart(3, '0')}`

      client = await tx.client.create({
        data: {
          businessId: orgId,
          displayId,
          displayName: request.clientName,
          email: request.clientEmail,
          companyName: request.companyName,
          phone: request.phone,
          industry: request.industry,
          preferredChannel: request.preferredChannel,
        }
      })
    }

    // Create Project with atomic sequence
    const projBusiness = await tx.business.update({
      where: { id: orgId },
      data: { projectSequence: { increment: 1 } },
      select: { projectSequence: true }
    })
    const projectDisplayId = `PRJ-${String(projBusiness.projectSequence).padStart(3, '0')}`

    const project = await tx.project.create({
      data: {
        businessId: orgId,
        displayId: projectDisplayId,
        clientId: client.id,
        title: request.projectTitle,
        type: request.projectType || 'Standard',
        statusStageId: firstStage?.id || null,
      }
    })

    // Add Script as Note if text provided
    if (request.scriptText) {
      await tx.note.create({
        data: {
          projectId: project.id,
          type: 'client',
          content: `**Initial Script/Brief:**\n\n${request.scriptText}`
        }
      })
    }

    // Add Links
    if (request.scriptLink) {
      await tx.projectLink.create({
        data: {
          projectId: project.id,
          label: 'Script Document',
          url: request.scriptLink
        }
      })
    }

    if (request.rawFootageLink) {
      await tx.projectLink.create({
        data: {
          projectId: project.id,
          label: 'Raw Footage',
          url: request.rawFootageLink
        }
      })
    }

    // Mark request as approved
    await tx.projectRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED', resolvedAt: new Date() }
    })

    return { client, project }
  })

  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard')
  return { success: true, projectId: project.id, clientId: client.id }
}

export async function rejectProjectRequest(requestId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  await prisma.projectRequest.updateMany({
    where: { id: requestId, businessId: orgId, status: 'PENDING' },
    data: { status: 'REJECTED', resolvedAt: new Date() }
  })

  revalidatePath('/dashboard/pipeline')
  revalidatePath('/dashboard')
  return { success: true }
}


export async function createReviewRequest(projectId: string, draftLink: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId },
    include: { client: true }
  })

  if (!project) throw new Error('Project not found')

  const request = await withUniqueToken(async (token) =>
    prisma.reviewRequest.create({
      data: {
        businessId: orgId,
        projectId,
        clientId: project.clientId,
        token,
        draftLink
      }
    })
  )

  revalidatePath('/dashboard/prodp')
  return request
}

export async function getReviewRequestByToken(token: string) {
  return await prisma.reviewRequest.findUnique({
    where: { token },
    include: {
      business: true,
      project: true,
      client: true
    }
  })
}

export async function submitReviewNotes(token: string, notes: string, links: string) {
  await checkRateLimit()
  const validatedData = ReviewNotesSchema.parse({ notes, links })

  const request = await prisma.reviewRequest.findUnique({
    where: { token },
    include: { project: true, client: true }
  })

  if (!request) throw new Error('Request not found')
  if (request.status !== 'PENDING') throw new Error('Review already submitted')

  await prisma.reviewRequest.update({
    where: { id: request.id },
    data: {
      clientNotes: validatedData.notes,
      clientLinks: validatedData.links,
      status: 'REPLIED'
    }
  })

  // Notify Business Members
  try {
    await broadcastNotification({
      businessId: request.businessId,
      title: "Client Revision Notes",
      message: `${request.client.displayName} added revisions for "${request.project.title}".`,
      type: "project",
      actionUrl: `/dashboard/prodp`
    })
  } catch (err) {
    console.error("Notification failed", err)
  }

  return { success: true }
}

export async function getActiveReviewRequests() {
  const { orgId } = await auth()
  if (!orgId) return []

  return await prisma.reviewRequest.findMany({
    where: { businessId: orgId },
    include: { project: true, client: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function deleteReviewRequest(id: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  await prisma.reviewRequest.deleteMany({
    where: { id, businessId: orgId }
  })
  
  revalidatePath('/dashboard/prodp')
  revalidatePath('/dashboard')
}

export async function resolveReviewRequest(id: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  await prisma.reviewRequest.updateMany({
    where: { id, businessId: orgId },
    data: { status: 'RESOLVED' }
  })
  
  revalidatePath('/dashboard/prodp')
  revalidatePath('/dashboard')
}
