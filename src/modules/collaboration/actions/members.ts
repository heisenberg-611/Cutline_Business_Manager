'use server'

import prisma from '@/modules/core/db/prisma'
import { revalidatePath } from 'next/cache'
import { createNotification } from '@/modules/notifications/services'
import type { ProjectMemberRole } from '@prisma/client'
import { authorizeProjectAccess } from '@/modules/projects/authz'
import { requireCollaborationPlan } from '../authz'

export type ProjectMemberRow = {
  userId: string
  role: ProjectMemberRole
  firstName: string | null
  lastName: string | null
  email: string
  imageUrl: string | null
  /** True for the project's lead (Project.assigneeId). */
  isLead: boolean
}

/**
 * Members of a project, leads first.
 *
 * Requires only 'read': anyone who can see the project can see who is on it.
 * Changing the list requires 'manage'.
 */
export async function getProjectMembers(projectId: string): Promise<ProjectMemberRow[]> {
  const { orgId, project } = await authorizeProjectAccess(projectId, 'read')
  await requireCollaborationPlan(orgId)

  const rows = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return rows
    .map((row) => ({
      userId: row.userId,
      role: row.role,
      firstName: row.user.firstName,
      lastName: row.user.lastName,
      email: row.user.email,
      imageUrl: row.user.imageUrl,
      isLead: project.assigneeId === row.userId,
    }))
    .sort((a, b) => Number(b.isLead) - Number(a.isLead))
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: ProjectMemberRole = 'COLLABORATOR'
) {
  const { orgId, userId: actorId, project } = await authorizeProjectAccess(projectId, 'manage')
  await requireCollaborationPlan(orgId)

  // The candidate comes from the client, so confirm they are in this business
  // before granting them access to a project.
  const membership = await prisma.businessMembership.findUnique({
    where: { businessId_userId: { businessId: orgId, userId } },
    select: { userId: true },
  })
  if (!membership) throw new Error('That person is not a member of this business.')

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { userId: true },
  })
  if (existing) throw new Error('They are already on this project.')

  await prisma.projectMember.create({
    data: { projectId, userId, role, addedBy: actorId },
  })

  await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: 'Project',
      entityId: projectId,
      action: 'PROJECT_MEMBER_ADDED',
      actorUserId: actorId,
      metadataJson: JSON.stringify({ userId, role }),
    },
  })

  if (userId !== actorId) {
    await createNotification({
      businessId: orgId,
      userId,
      title: 'Added to a project',
      message: `You now have access to "${project.title}".`,
      type: 'project',
      actionUrl: `/dashboard/collaboration/${projectId}`,
    })
  }

  revalidatePath(`/dashboard/collaboration/${projectId}`)
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: ProjectMemberRole
) {
  const { orgId, userId: actorId, project } = await authorizeProjectAccess(projectId, 'manage')
  await requireCollaborationPlan(orgId)

  // Demoting the lead would leave a project whose lead cannot manage it, so the
  // lead's role is changed by reassigning the project, not from here.
  if (project.assigneeId === userId && role !== 'OWNER') {
    throw new Error('Change the project lead before lowering their role.')
  }

  const updated = await prisma.projectMember.updateMany({
    where: { projectId, userId },
    data: { role },
  })
  if (updated.count === 0) throw new Error('They are not on this project.')

  await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: 'Project',
      entityId: projectId,
      action: 'PROJECT_MEMBER_ROLE_CHANGED',
      actorUserId: actorId,
      metadataJson: JSON.stringify({ userId, role }),
    },
  })

  revalidatePath(`/dashboard/collaboration/${projectId}`)
}

export async function removeProjectMember(projectId: string, userId: string) {
  const { orgId, userId: actorId, project } = await authorizeProjectAccess(projectId, 'manage')
  await requireCollaborationPlan(orgId)

  // Removing the lead would leave Project.assigneeId pointing at someone with no
  // membership row, which the authorizer's legacy fallback would still honour —
  // so the removal would not actually take effect.
  if (project.assigneeId === userId) {
    throw new Error('Reassign the project before removing its lead.')
  }

  const removed = await prisma.projectMember.deleteMany({ where: { projectId, userId } })
  if (removed.count === 0) throw new Error('They are not on this project.')

  await prisma.auditLog.create({
    data: {
      businessId: orgId,
      entityType: 'Project',
      entityId: projectId,
      action: 'PROJECT_MEMBER_REMOVED',
      actorUserId: actorId,
      metadataJson: JSON.stringify({ userId }),
    },
  })

  revalidatePath(`/dashboard/collaboration/${projectId}`)
}

/** Business members not yet on this project, for the add picker. */
export async function getAddableMembers(projectId: string) {
  const { orgId } = await authorizeProjectAccess(projectId, 'manage')
  await requireCollaborationPlan(orgId)

  const [businessMembers, projectMembers] = await Promise.all([
    prisma.businessMembership.findMany({
      where: { businessId: orgId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.projectMember.findMany({ where: { projectId }, select: { userId: true } }),
  ])

  const taken = new Set(projectMembers.map((m) => m.userId))
  return businessMembers.filter((m) => !taken.has(m.userId)).map((m) => m.user)
}
