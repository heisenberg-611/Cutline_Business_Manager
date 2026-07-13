'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/modules/core/db/prisma'
import { randomBytes } from 'crypto'
import { sendFeedbackEmail } from '@/lib/email/resend'
import { withUniqueToken } from '@/lib/utils/unique-token'
import { createNotification, broadcastNotification } from '@/modules/notifications/services'
import { getAppUrl } from '@/lib/utils'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/utils/rate-limit'

const FeedbackSchema = z.object({
  overallScore: z.number().int().min(1).max(10),
  dimensionScores: z.any().optional(),
  commentText: z.string().max(10000).optional(),
  videoUrl: z.string().url().max(500).optional().or(z.literal('')),
  consentToPublish: z.boolean()
})

// -----------------------------------------------------------------------------
// EDITOR/ADMIN ACTIONS (Requires Auth)
// -----------------------------------------------------------------------------

export async function createFeedbackRequest(projectId: string, clientId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })
  if (!project) throw new Error('Project not found')

  // Check if a pending request already exists to avoid duplicates
  const existing = await prisma.feedbackRequest.findFirst({
    where: {
      businessId: orgId,
      projectId,
      clientId,
      status: 'PENDING'
    }
  })

  if (existing) {
    return existing
  }

  const request = await withUniqueToken(async (token) =>
    prisma.feedbackRequest.create({
      data: {
        businessId: orgId,
        projectId,
        clientId,
        token,
        status: 'PENDING'
      }
    })
  )

  revalidatePath('/dashboard/feedback')
  return request
}

export async function sendFeedbackEmailAction(projectId: string, token: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const request = await prisma.feedbackRequest.findFirst({
    where: { token, businessId: orgId, projectId },
    include: {
      business: true,
      client: true,
      project: true
    }
  })

  if (!request) throw new Error('Feedback request not found')
  if (!request.client.email) throw new Error('Client does not have an email address')

  const appUrl = getAppUrl()
  const feedbackLink = `${appUrl}/feedback/${token}`

  const customSubject = request.business.feedbackEmailSubjectTemplate
    .replace(/\{\{client_name\}\}/g, request.client.displayName)
    .replace(/\{\{project_name\}\}/g, request.project.title)
    .replace(/\{\{business_name\}\}/g, request.business.name)

  const customBody = request.business.feedbackEmailBodyTemplate
    .replace(/\{\{client_name\}\}/g, request.client.displayName)
    .replace(/\{\{project_name\}\}/g, request.project.title)
    .replace(/\{\{business_name\}\}/g, request.business.name)

  await sendFeedbackEmail(request.client.email, {
    businessName: request.business.name,
    clientName: request.client.displayName,
    projectName: request.project.title,
    feedbackLink,
    customSubject,
    customBody
  })

  return { success: true }
}

export async function getFeedbackRequests() {
  const { orgId } = await auth()
  if (!orgId) return []

  return await prisma.feedbackRequest.findMany({
    where: { businessId: orgId },
    include: {
      project: true,
      client: true,
      response: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

export async function getFeedbackResponses() {
  const { orgId } = await auth()
  if (!orgId) return []

  return await prisma.feedbackResponse.findMany({
    where: { businessId: orgId },
    include: {
      request: {
        include: {
          project: true,
          client: true
        }
      },
      testimonial: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

export async function convertToTestimonial(responseId: string, displayText: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const response = await prisma.feedbackResponse.findFirst({
    where: { id: responseId, businessId: orgId },
    include: { request: true }
  })
  
  if (!response) throw new Error('Response not found')
  if (!response.consentToPublish) throw new Error('Client did not consent to publish')

  const testimonial = await prisma.testimonial.upsert({
    where: { feedbackResponseId: response.id },
    update: {
      displayText,
      videoRef: response.videoUrl,
    },
    create: {
      businessId: orgId,
      feedbackResponseId: response.id,
      projectId: response.request.projectId,
      clientId: response.request.clientId,
      displayText,
      videoRef: response.videoUrl,
      isPublished: true,
      publishedAt: new Date()
    }
  })

  revalidatePath('/dashboard/feedback')
  revalidatePath('/dashboard/feedback/testimonials')
  return testimonial
}

export async function getTestimonials() {
  const { orgId } = await auth()
  if (!orgId) return []

  return await prisma.testimonial.findMany({
    where: { businessId: orgId },
    include: {
      project: true,
      client: true,
      feedbackResponse: true
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  })
}

export async function toggleTestimonialPublishStatus(testimonialId: string, isPublished: boolean) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  await prisma.testimonial.update({
    where: { id: testimonialId, businessId: orgId },
    data: {
      isPublished,
      publishedAt: isPublished ? new Date() : null
    }
  })

  revalidatePath('/dashboard/feedback/testimonials')
}

export async function updateTestimonial(testimonialId: string, displayText: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  await prisma.testimonial.update({
    where: { id: testimonialId, businessId: orgId },
    data: { displayText }
  })

  revalidatePath('/dashboard/feedback/testimonials')
}

export async function deleteFeedbackResponse(responseId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const response = await prisma.feedbackResponse.findUnique({
    where: { id: responseId, businessId: orgId }
  })

  if (response) {
    await prisma.feedbackRequest.deleteMany({
      where: { id: response.requestId }
    })
  }

  revalidatePath('/dashboard/feedback')
  revalidatePath('/dashboard')
}

export async function resolveFeedbackAction(requestId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  await prisma.feedbackRequest.update({
    where: { id: requestId, businessId: orgId },
    data: { status: 'RESOLVED' }
  })
  
  revalidatePath('/dashboard/feedback')
  revalidatePath('/dashboard')
}

export async function deleteFeedbackRequest(requestId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const request = await prisma.feedbackRequest.findUnique({
    where: { id: requestId, businessId: orgId }
  })

  if (request) {
    await prisma.feedbackRequest.delete({
      where: { id: requestId }
    })
  }

  revalidatePath('/dashboard/feedback/requests')
  revalidatePath('/dashboard/feedback')
}

// -----------------------------------------------------------------------------
// PUBLIC ACTIONS (No Auth Required)
// -----------------------------------------------------------------------------

export async function getFeedbackRequestByToken(token: string) {
  await checkRateLimit()
  return await prisma.feedbackRequest.findUnique({
    where: { token },
    include: {
      project: { select: { title: true } },
      business: { select: { name: true } }
    }
  })
}

export async function submitFeedbackResponse(
  token: string,
  data: {
    overallScore: number
    dimensionScores?: any
    commentText?: string
    videoUrl?: string
    consentToPublish: boolean
  }
) {
  await checkRateLimit()
  const validatedData = FeedbackSchema.parse(data)

  const request = await prisma.feedbackRequest.findUnique({
    where: { token },
    include: {
      project: true,
      client: true
    }
  })

  if (!request) throw new Error('Invalid feedback token')
  if (request.status !== 'PENDING') throw new Error('Feedback request is no longer pending')

  let response
  try {
    response = await prisma.$transaction(async (tx) => {
      const newResponse = await tx.feedbackResponse.create({
        data: {
          businessId: request.businessId,
          requestId: request.id,
          overallScore: validatedData.overallScore,
          dimensionScores: validatedData.dimensionScores,
          commentText: validatedData.commentText,
          videoUrl: validatedData.videoUrl || undefined,
          consentToPublish: validatedData.consentToPublish
        }
      })

      await tx.feedbackRequest.update({
        where: { id: request.id },
        data: { status: 'COMPLETED' }
      })

      return newResponse
    })
  } catch (err: any) {
    // Handle race condition: concurrent submission hit @@unique(requestId)
    if (err.code === 'P2002') {
      throw new Error('Feedback has already been submitted for this request')
    }
    throw err
  }

  // Notify all business members
  try {
    await broadcastNotification({
      businessId: request.businessId,
      title: "New Client Feedback",
      message: `${request.client.displayName} just submitted feedback for "${request.project.title}" (Score: ${validatedData.overallScore}/10).`,
      type: "feedback",
      actionUrl: "/dashboard/feedback"
    })
  } catch (err) {
    console.error("Failed to send feedback notification:", err)
  }

  return response
}
