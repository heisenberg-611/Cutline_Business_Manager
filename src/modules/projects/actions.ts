'use server'

import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/modules/core/db/prisma'

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

  const project = await prisma.project.create({
    data: {
      businessId: orgId,
      clientId,
      title,
      type: type || null,
      priority: priority || null,
      deadline
    }
  })

  revalidatePath('/dashboard/projects')
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
    where: { id: projectId },
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

  await prisma.project.delete({
    where: { id: projectId }
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
      assets: {
        include: { asset: true }
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
      client: true,
      assets: {
        include: { asset: true }
      }
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
    where: { id: projectId },
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
    where: { id: projectId },
    data: { isArchived: false }
  })

  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard/archive')
  revalidatePath('/dashboard/pipeline')
  revalidatePath(`/dashboard/projects/${projectId}`)
}
