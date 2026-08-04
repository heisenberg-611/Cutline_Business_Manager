import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import prisma from '@/modules/core/db/prisma'
import { canAccessProject } from '@/modules/projects/authz'
import { TaskPanel } from '@/modules/collaboration/components/TaskPanel'
import { CommentThread } from '@/modules/collaboration/components/CommentThread'
import { ActivityFeed } from '@/modules/collaboration/components/ActivityFeed'
import { getTasks } from '@/modules/collaboration/actions/tasks'
import { getComments, getMentionableUsers } from '@/modules/collaboration/actions/comments'
import { getProjectActivity } from '@/modules/collaboration/actions/activity'
import { MemberPanel } from '@/modules/collaboration/components/MemberPanel'
import { getProjectMembers, getAddableMembers } from '@/modules/collaboration/actions/members'
import { Badge } from '@/components/ui/badge'

export default async function ProjectCollaborationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { orgId, userId, orgRole } = await auth()

  if (!orgId || !userId) {
    redirect('/dashboard/select-business')
  }

  const { id } = await params

  // Read access is checked before anything is fetched; the actions authorize
  // independently, but this decides between 404 and rendering.
  if (!(await canAccessProject(id, 'read'))) {
    notFound()
  }

  const [project, tasks, comments, activity, mentionable, canEdit] = await Promise.all([
    prisma.project.findFirst({
      where: { id, businessId: orgId },
      select: {
        id: true,
        title: true,
        displayId: true,
        client: { select: { displayName: true } },
        statusStage: { select: { name: true } },
      },
    }),
    getTasks(id),
    getComments('Project', id),
    getProjectActivity(id),
    // People on this project plus admins — not everyone in the business. Used
    // for both the @ picker and the task assignee list, so neither can offer
    // someone who has no access to the project.
    getMentionableUsers(id),
    canAccessProject(id, 'write'),
  ])

  if (!project) {
    notFound()
  }

  // Only fetched when the caller can actually change the list — getAddableMembers
  // itself requires 'manage', so calling it unconditionally would throw.
  const canManage = await canAccessProject(id, 'manage')
  const [projectMembers, addableMembers] = await Promise.all([
    getProjectMembers(id),
    canManage ? getAddableMembers(id) : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <Link
          href="/dashboard/collaboration"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h3 className="break-words text-xl font-bold leading-tight text-zinc-900 sm:text-2xl sm:leading-6 dark:text-zinc-100">
            {project.title}
          </h3>
          {project.displayId && (
            <Badge variant="outline" className="text-xs">
              {project.displayId}
            </Badge>
          )}
          {project.statusStage && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {project.statusStage.name}
            </span>
          )}
        </div>

        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
          {project.client?.displayName}
          <Link
            href={`/dashboard/projects/${project.id}`}
            className="text-zinc-500 underline transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
          >
            Open project details
          </Link>
        </p>
      </div>

      <MemberPanel
        projectId={project.id}
        members={projectMembers}
        addable={addableMembers}
        canManage={canManage}
      />

      <TaskPanel
        projectId={project.id}
        tasks={tasks}
        members={mentionable}
        canEdit={canEdit}
      />

      <CommentThread
        entityType="Project"
        entityId={project.id}
        comments={comments}
        members={mentionable}
        currentUserId={userId}
        isAdmin={orgRole === 'org:admin'}
        canComment={canEdit}
      />

      <ActivityFeed
        projectId={project.id}
        initialEntries={activity.entries}
        initialCursor={activity.nextCursor}
      />
    </div>
  )
}
