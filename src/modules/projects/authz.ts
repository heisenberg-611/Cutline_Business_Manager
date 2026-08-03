import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'
import type { Project, ProjectMemberRole } from '@prisma/client'

/**
 * Centralized project authorization.
 *
 * Replaces the `orgRole !== 'org:admin' && project.assigneeId !== userId` check
 * that was duplicated across every project mutation. That rule allowed exactly
 * one person per project; access now comes from the ProjectMember table so a
 * project can have several collaborators.
 *
 * Mirrors the shape of modules/messaging/auth.ts: resolve the session, confirm
 * the row belongs to the caller's tenant, then check the caller's rights.
 */

export type ProjectAccessLevel = 'read' | 'write' | 'manage'

/** What each member role is permitted to do. Admins bypass this entirely. */
const ROLE_GRANTS: Record<ProjectMemberRole, ProjectAccessLevel[]> = {
  OWNER: ['read', 'write', 'manage'],
  COLLABORATOR: ['read', 'write'],
  WATCHER: ['read'],
}

/**
 * Says which of the two reasons access was denied, because they call for
 * different responses from the reader.
 *
 * "You are not assigned to this project" was previously used for both, which is
 * plainly wrong for a WATCHER: they *are* on the project and can see it, so
 * being told they are not assigned to it reads like a bug rather than a
 * permission boundary. Someone who is not a member at all cannot fix their own
 * situation either way, but a watcher can — by asking to be upgraded.
 */
function deniedMessage(role: ProjectMemberRole | null, level: ProjectAccessLevel): string {
  if (!role) {
    return 'Forbidden: You are not a member of this project.'
  }

  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase()

  if (level === 'manage') {
    return `Forbidden: ${roleLabel}s cannot manage this project's members. Ask an owner or an admin.`
  }

  return `Forbidden: You are a ${roleLabel.toLowerCase()} on this project, so you can read it but not make changes. Ask an owner or an admin for access.`
}

export type ProjectAuthContext = {
  userId: string
  orgId: string
  orgRole: string | undefined
  isAdmin: boolean
  /** Null when access was granted by org:admin rather than membership. */
  memberRole: ProjectMemberRole | null
  project: Project
}

/**
 * Throws unless the caller may act on `projectId` at `level`.
 *
 * - 'read'   — view the project and its notes/tasks/comments
 * - 'write'  — edit the project and its child records
 * - 'manage' — change the member list or delete the project
 *
 * Errors intentionally match the previous strings so existing UI error
 * handling keeps working.
 */
export async function authorizeProjectAccess(
  projectId: string,
  level: ProjectAccessLevel
): Promise<ProjectAuthContext> {
  const { userId, orgId, orgRole } = await auth()

  if (!orgId || !userId) {
    throw new Error('Unauthorized')
  }

  // Tenant scoping first — a project outside the caller's business must be
  // indistinguishable from one that does not exist.
  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId: orgId },
  })

  if (!project) {
    throw new Error('Project not found')
  }

  if (orgRole === 'org:admin') {
    return { userId, orgId, orgRole, isAdmin: true, memberRole: null, project }
  }

  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { role: true },
  })

  // Fallback to the legacy pointer. The backfill migration covers existing
  // rows, but this keeps a project reachable if any path ever writes
  // assigneeId without a matching ProjectMember row.
  const effectiveRole: ProjectMemberRole | null =
    membership?.role ?? (project.assigneeId === userId ? 'OWNER' : null)

  if (!effectiveRole || !ROLE_GRANTS[effectiveRole].includes(level)) {
    throw new Error(deniedMessage(effectiveRole, level))
  }

  return { userId, orgId, orgRole, isAdmin: false, memberRole: effectiveRole, project }
}

/**
 * Prisma filter for "projects this member can see".
 *
 * The single definition every list screen uses, so visibility cannot drift from
 * what authorizeProjectAccess actually grants. Before this existed, the project
 * list, pipeline, dashboard and ProdP all filtered on `assigneeId` while
 * authorization read ProjectMember — so a collaborator could edit a project
 * that appeared nowhere in their own navigation.
 *
 * `assigneeId` is included for the same reason the authorizer falls back to it:
 * any project whose membership row is missing stays reachable by its lead.
 *
 * Admins are not subject to this — callers apply it only for org:member.
 */
export function visibleProjectFilter(userId: string) {
  return {
    OR: [{ members: { some: { userId } } }, { assigneeId: userId }],
  }
}

/**
 * Non-throwing variant, for deciding whether to render editing controls.
 *
 * Server actions still authorize independently — this only shapes the UI, and
 * hiding a control is not access control.
 */
export async function canAccessProject(
  projectId: string,
  level: ProjectAccessLevel
): Promise<boolean> {
  try {
    await authorizeProjectAccess(projectId, level)
    return true
  } catch {
    return false
  }
}

/**
 * Batch variant for the pipeline board, which reorders many projects at once.
 * Verifies every id individually so an unauthorized project cannot ride along
 * in the payload.
 */
export async function authorizeProjectsAccess(
  projectIds: string[],
  level: ProjectAccessLevel
): Promise<{ userId: string; orgId: string; orgRole: string | undefined; isAdmin: boolean }> {
  const { userId, orgId, orgRole } = await auth()

  if (!orgId || !userId) {
    throw new Error('Unauthorized')
  }

  const unique = [...new Set(projectIds)]

  if (orgRole === 'org:admin') {
    // Still confirm every project is in this tenant before mutating.
    const count = await prisma.project.count({
      where: { id: { in: unique }, businessId: orgId },
    })
    if (count !== unique.length) {
      throw new Error('Project not found')
    }
    return { userId, orgId, orgRole, isAdmin: true }
  }

  const projects = await prisma.project.findMany({
    where: { id: { in: unique }, businessId: orgId },
    select: { id: true, assigneeId: true },
  })

  // A missing project means it belongs to another tenant; reject rather than
  // silently skipping it, which is what the previous per-project loop did.
  if (projects.length !== unique.length) {
    throw new Error('Project not found')
  }

  const memberships = await prisma.projectMember.findMany({
    where: { projectId: { in: unique }, userId },
    select: { projectId: true, role: true },
  })
  const roleByProject = new Map<string, ProjectMemberRole>(
    memberships.map((m) => [m.projectId, m.role])
  )

  for (const project of projects) {
    const role: ProjectMemberRole | null =
      roleByProject.get(project.id) ?? (project.assigneeId === userId ? 'OWNER' : null)
    if (!role || !ROLE_GRANTS[role].includes(level)) {
      throw new Error(deniedMessage(role, level))
    }
  }

  return { userId, orgId, orgRole, isAdmin: false }
}

/**
 * Keeps ProjectMember in step with the legacy Project.assigneeId pointer.
 *
 * Reassigning hands ownership over rather than cutting the outgoing assignee
 * out: they are demoted OWNER -> COLLABORATOR, so they keep read/write on work
 * they were until now responsible for, but lose the ability to manage the
 * member list. Under the old single-assignee rule they lost access entirely,
 * because access *was* the pointer; with several members per project that is
 * needlessly destructive — someone mid-handover can still finish their work.
 *
 * Only an OWNER row is touched, so a member added explicitly as COLLABORATOR
 * or WATCHER keeps whatever role they were given.
 *
 * Caller is responsible for tenant checks — this only writes membership rows.
 */
export async function syncAssigneeMembership(
  projectId: string,
  newAssigneeId: string | null,
  previousAssigneeId: string | null,
  actorUserId: string
) {
  if (previousAssigneeId && previousAssigneeId !== newAssigneeId) {
    await prisma.projectMember.updateMany({
      where: { projectId, userId: previousAssigneeId, role: 'OWNER' },
      data: { role: 'COLLABORATOR' },
    })
  }

  if (newAssigneeId) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: newAssigneeId } },
      update: { role: 'OWNER' },
      create: { projectId, userId: newAssigneeId, role: 'OWNER', addedBy: actorUserId },
    })
  }
}
