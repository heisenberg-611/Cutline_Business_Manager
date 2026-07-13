'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/modules/core/db/prisma'
import { ensureDefaultTemplate } from '@/modules/workflow/actions'

// -----------------------------------------------------------------------------
// DUPLICATE CHECK QUERIES (for live form validation)
// -----------------------------------------------------------------------------

export async function checkProjectDuplicate(title: string, clientId: string): Promise<{ exists: boolean; projectTitle?: string }> {
  const { orgId } = await auth()
  if (!orgId || !title || !clientId) return { exists: false }

  const existing = await prisma.project.findFirst({
    where: {
      businessId: orgId,
      clientId,
      title: { equals: title.trim(), mode: 'insensitive' },
      isArchived: false
    },
    select: { title: true }
  })

  return existing ? { exists: true, projectTitle: existing.title } : { exists: false }
}

// -----------------------------------------------------------------------------
// MUTATIONS
// -----------------------------------------------------------------------------

export async function createProject(data: FormData) {
  const { orgId } = await auth()
  
  if (!orgId) {
    throw new Error('Unauthorized: No active business selected.')
  }

  const clientId = data.get('clientId') as string
  const title = data.get('title') as string
  const type = data.get('type') as string
  const priority = data.get('priority') as string
  const deadlineStr = data.get('deadline') as string

  if (!title || title.trim() === '') {
    throw new Error('Title is required')
  }

  if (!clientId || clientId.trim() === '') {
    throw new Error('Client is required')
  }

  const deadline = deadlineStr ? new Date(deadlineStr) : null

  const business = await prisma.business.update({
    where: { id: orgId },
    data: { projectSequence: { increment: 1 } },
    select: { projectSequence: true }
  })
  const displayId = `PRJ-${String(business.projectSequence).padStart(3, '0')}`

  const template = await ensureDefaultTemplate(orgId)
  const firstStageId = template?.stages[0]?.id || null

  const project = await prisma.project.create({
    data: {
      businessId: orgId,
      displayId,
      clientId,
      title,
      type: type || null,
      priority: priority || null,
      deadline,
      statusStageId: firstStageId,
      ...(firstStageId ? {
        stageHistory: {
          create: {
            stageId: firstStageId
          }
        }
      } : {})
    }
  })

  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard/pipeline')
  return project
}

export async function updateProject(projectId: string, data: { title: string, deadline: Date | null, priority: string | null }) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })
  if (!project) throw new Error('Project not found')

  await prisma.project.update({
    where: { id: projectId, businessId: orgId },
    data
  })

  revalidatePath('/dashboard/projects')
  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function deleteProject(projectId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })
  if (!project) throw new Error('Project not found')

  await prisma.project.deleteMany({
    where: { id: projectId, businessId: orgId }
  })

  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard/pipeline')
}

export async function getProjects(orgId: string) {
  if (!orgId) {
    return []
  }

  return await prisma.project.findMany({
    where: {
      businessId: orgId,
      isArchived: false
    },
    include: {
      client: true,
      statusStage: {
        include: {
          template: {
            include: {
              stages: {
                orderBy: { orderIndex: 'asc' }
              }
            }
          }
        }
      },
      stageHistory: {
        orderBy: { enteredAt: 'desc' },
        take: 1
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function getArchivedProjects(orgId: string) {
  if (!orgId) {
    return []
  }

  return await prisma.project.findMany({
    where: {
      businessId: orgId,
      isArchived: true
    },
    include: {
      client: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })
}

export async function archiveProject(projectId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })
  if (!project) throw new Error('Project not found')

  await prisma.project.update({
    where: { id: projectId, businessId: orgId },
    data: { isArchived: true }
  })

  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard/archive')
  revalidatePath('/dashboard/pipeline')
  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function unarchiveProject(projectId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })
  if (!project) throw new Error('Project not found')

  await prisma.project.update({
    where: { id: projectId, businessId: orgId },
    data: { isArchived: false }
  })

  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard/archive')
  revalidatePath('/dashboard/pipeline')
  revalidatePath(`/dashboard/projects/${projectId}`)
}
