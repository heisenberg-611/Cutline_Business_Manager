'use server'

import { auth } from '@clerk/nextjs/server'
import { requireAdmin } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import prisma from '@/modules/core/db/prisma'
import { ensureDefaultTemplate } from '@/modules/workflow/actions'
import { sendPushNotification } from '@/lib/onesignal'

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

export async function getOrgUsers(orgId: string) {
  const { orgId: userOrgId } = await auth()
  if (!userOrgId || userOrgId !== orgId) throw new Error('Unauthorized')
  
  return await prisma.businessMembership.findMany({
    where: { businessId: orgId },
    include: { user: true },
    orderBy: { createdAt: 'desc' }
  })
}

export async function createProject(data: FormData) {
  const { orgId, orgRole } = await auth()
  
  if (!orgId) {
    throw new Error('Unauthorized: No active business selected.')
  }

  const clientId = data.get('clientId') as string
  const title = data.get('title') as string
  const type = data.get('type') as string
  const priority = data.get('priority') as string
  const deadlineStr = data.get('deadline') as string
  const assigneeId = data.get('assigneeId') as string

  // Only Admins can set an assignee
  if (assigneeId && orgRole !== 'org:admin') {
    throw new Error('Forbidden: Only Admins can assign projects.')
  }

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
      assigneeId: assigneeId || null,
      ...(firstStageId ? {
        stageHistory: {
          create: {
            stageId: firstStageId
          }
        }
      } : {})
    }
  })

  if (assigneeId) {
    await prisma.notification.create({
      data: {
        businessId: orgId,
        userId: assigneeId,
        title: 'New Project Assignment',
        message: `You have been assigned to project "${project.title}".`,
        type: 'project',
        actionUrl: `/dashboard/projects/${project.id}`
      }
    })

    await sendPushNotification(
      'New Project Assignment',
      `You have been assigned to project "${project.title}".`,
      [assigneeId],
      `/dashboard/projects/${project.id}`
    ).catch(console.error)
  }

  revalidatePath('/dashboard/projects')
  revalidatePath('/dashboard/pipeline')
  return project
}

export async function updateProject(projectId: string, data: { title?: string, deadline?: Date | null, priority?: string | null, assigneeId?: string | null }) {
  const { orgId, orgRole, userId } = await auth()
  if (!orgId) throw new Error('Unauthorized')

  if ('assigneeId' in data && orgRole !== 'org:admin') {
    throw new Error('Forbidden: Only Admins can reassign projects.')
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId }
  })
  if (!project) throw new Error('Project not found')

  const oldAssigneeId = project.assigneeId

  await prisma.project.update({
    where: { id: projectId, businessId: orgId },
    data
  })

  if ('assigneeId' in data && data.assigneeId !== undefined && oldAssigneeId !== data.assigneeId) {
    await prisma.auditLog.create({
      data: {
        businessId: orgId,
        entityType: 'Project',
        entityId: projectId,
        action: 'ASSIGNEE_CHANGED',
        actorUserId: userId,
        metadataJson: JSON.stringify({ oldAssigneeId, newAssigneeId: data.assigneeId })
      }
    })

    if (data.assigneeId) {
      await prisma.notification.create({
        data: {
          businessId: orgId,
          userId: data.assigneeId,
          title: 'Project Assignment',
          message: `You have been assigned to project "${project.title}".`,
          type: 'project',
          actionUrl: `/dashboard/projects/${project.id}`
        }
      })

      await sendPushNotification(
        'Project Assignment',
        `You have been assigned to project "${project.title}".`,
        [data.assigneeId],
        `/dashboard/projects/${project.id}`
      ).catch(console.error)
    }
  }

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
  const { orgId: userOrgId, userId, orgRole } = await auth()
  if (!userOrgId || userOrgId !== orgId) throw new Error('Unauthorized')

  const isMember = orgRole !== 'org:admin';

  const projects = await prisma.project.findMany({
    where: {
      businessId: orgId,
      isArchived: false,
      ...(isMember ? { assigneeId: userId } : {})
    },
    include: {
      client: true,
      assignee: true,
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

  if (isMember) {
    return projects.map(p => ({
      ...p,
      client: {
        ...p.client,
        email: null,
        phone: null,
        industry: null,
        preferredChannel: null,
        internalRating: null,
      }
    }))
  }

  return projects
}

export async function getArchivedProjects(orgId: string) {
  const { orgId: userOrgId } = await requireAdmin()

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
  const { orgId } = await requireAdmin()

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
  const { orgId } = await requireAdmin()

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
