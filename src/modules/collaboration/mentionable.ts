import prisma from '@/modules/core/db/prisma'

/**
 * Who can be @mentioned on a project.
 *
 * Project members, plus every org:admin. Admins are always included because
 * authorizeProjectAccess grants them access to every project regardless of
 * membership — so a mention will always resolve to something they can open.
 *
 * Anyone else is excluded: mentioning them would notify them about, and link
 * them to, a project they would be denied on arrival.
 *
 * Deliberately not a 'use server' module. Both the picker action and the
 * server-side validation in createComment/editComment call this, so the rule
 * exists once rather than being restated on each side.
 */
export type MentionableUser = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string
  imageUrl: string | null
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  imageUrl: true,
} as const

export async function mentionableUsersForProject(
  businessId: string,
  projectId: string
): Promise<MentionableUser[]> {
  const [projectMembers, admins] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      select: { user: { select: userSelect } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.businessMembership.findMany({
      where: { businessId, role: 'org:admin' },
      select: { user: { select: userSelect } },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // The project lead is usually also an admin, so dedupe by id.
  const byId = new Map<string, MentionableUser>()
  for (const row of [...projectMembers, ...admins]) {
    byId.set(row.user.id, row.user)
  }

  // The lead may predate ProjectMember; include them so they never become
  // unmentionable on their own project.
  const project = await prisma.project.findFirst({
    where: { id: projectId, businessId },
    select: { assignee: { select: userSelect } },
  })
  if (project?.assignee) {
    byId.set(project.assignee.id, project.assignee)
  }

  return [...byId.values()]
}

/** Id set form, for validating mention tokens parsed out of a comment body. */
export async function mentionableUserIds(
  businessId: string,
  projectId: string
): Promise<Set<string>> {
  const users = await mentionableUsersForProject(businessId, projectId)
  return new Set(users.map((u) => u.id))
}
