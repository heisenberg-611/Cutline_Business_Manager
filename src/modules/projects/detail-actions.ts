'use server'

import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { authorizeProjectAccess } from './authz'

export async function getProjectDetails(projectId: string) {
  let ctx
  try {
    ctx = await authorizeProjectAccess(projectId, 'read')
  } catch (error) {
    // Preserve the previous contract: a missing project returns null so the
    // page can render notFound(). Permission failures still throw.
    if (error instanceof Error && error.message === 'Project not found') return null
    throw error
  }

  const { orgId } = ctx

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
      },
      links: {
        orderBy: { createdAt: 'desc' }
      },
      assets: {
        include: {
          asset: true
        }
      }
    }
  })

  if (!project) return null

  // Group 3: Least Privilege Client Data — non-admins never see client PII.
  if (!ctx.isAdmin) {
    project.client = {
      ...project.client,
      email: null,
      phone: null,
      industry: null,
      preferredChannel: null,
      internalRating: null,
    }
  }

  return project
}

export async function addNote(projectId: string, content: string, type: string) {
  const { userId } = await authorizeProjectAccess(projectId, 'write')

  await prisma.note.create({
    data: {
      projectId,
      content,
      type,
      createdBy: userId
    }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function logTime(projectId: string, durationMinutes: number, isBillable: boolean, notes?: string) {
  const { userId } = await authorizeProjectAccess(projectId, 'write')

  await prisma.timeEntry.create({
    data: {
      projectId,
      userId,
      durationMinutes,
      isBillable,
      notes,
      source: 'manual'
    }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function startTimer(projectId: string, isBillable: boolean) {
  const { userId } = await authorizeProjectAccess(projectId, 'write')

  await prisma.timeEntry.create({
    data: {
      projectId,
      userId,
      isBillable,
      startedAt: new Date(),
      source: 'stopwatch'
    }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function stopTimer(timeEntryId: string, projectId: string, notes?: string) {
  const { userId } = await authorizeProjectAccess(projectId, 'write')

  const entry = await prisma.timeEntry.findFirst({
    where: { id: timeEntryId, projectId, userId }
  })

  if (!entry || !entry.startedAt || entry.endedAt) {
    throw new Error('Invalid timer state')
  }

  const endedAt = new Date()
  const diffMs = endedAt.getTime() - entry.startedAt.getTime()
  const durationMinutes = Math.floor(diffMs / 60000)

  await prisma.timeEntry.update({
    where: { id: timeEntryId },
    data: {
      endedAt,
      durationMinutes,
      notes
    }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function deleteTimeLog(timeEntryId: string, projectId: string) {
  const { userId } = await authorizeProjectAccess(projectId, 'write')

  await prisma.timeEntry.delete({
    where: { id: timeEntryId, projectId }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function addLink(projectId: string, url: string, label: string) {
  await authorizeProjectAccess(projectId, 'write')

  await prisma.projectLink.create({
    data: {
      projectId,
      url,
      label
    }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
}

export async function deleteLink(linkId: string, projectId: string) {
  const { orgId } = await authorizeProjectAccess(projectId, 'write')

  await prisma.projectLink.deleteMany({
    where: { id: linkId, projectId, project: { businessId: orgId } }
  })

  revalidatePath(`/dashboard/projects/${projectId}`)
}
