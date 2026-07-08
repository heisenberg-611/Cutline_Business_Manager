'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'

export async function getProjectDetails(projectId: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      businessId: orgId
    },
    include: {
      client: true,
      statusStage: true,
      notes: {
        orderBy: { createdAt: 'desc' }
      },
      timeEntries: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!project) throw new Error('Project not found')
  return project
}

export async function addNote(projectId: string, content: string, type: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  // Verify access
  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })
  if (!project) throw new Error('Project not found')

  await prisma.note.create({
    data: {
      projectId,
      content,
      type
    }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function logTime(projectId: string, durationMinutes: number, isBillable: boolean) {
  const { orgId, userId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  // Verify access
  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })
  if (!project) throw new Error('Project not found')

  await prisma.timeEntry.create({
    data: {
      projectId,
      userId,
      durationMinutes,
      isBillable,
      source: 'manual'
    }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
}
