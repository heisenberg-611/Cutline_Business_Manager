import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckSquare, MessageSquare, Users2, type LucideIcon } from 'lucide-react'
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

  const openTasks = tasks.filter((t) => t.status !== 'DONE').length
  const commentCount = comments.reduce((sum, c) => sum + 1 + c.replies.length, 0)

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

        {/* Title on the left, the project's vitals on the right — on a phone the
            stats drop under the title instead of squeezing it. */}
        <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="break-words text-xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-100">
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

            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
              {project.client?.displayName}
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="inline-flex items-center gap-1 text-zinc-500 underline underline-offset-2 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
              >
                Open project details
              </Link>
            </p>
          </div>

          <dl className="flex shrink-0 items-center gap-5 text-sm">
            <Stat icon={CheckSquare} label="open" value={openTasks} />
            <Stat icon={MessageSquare} label="comment" value={commentCount} plural />
            <Stat icon={Users2} label="member" value={projectMembers.length} plural />
          </dl>
        </div>
      </div>

      {/* Work on the left, context on the right. Tasks and discussion are what
          people come here to do; members and history are reference.
          The page itself has no max-width, so the columns already widen with the
          monitor; the sidebar steps up with it so it does not end up a thin strip
          beside a very wide main column. */}
      {/* No items-start: the grid rows stretch, so both columns are as tall as
          the taller one and Activity can fill the sidebar down to the same
          bottom edge as the discussion. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:gap-6 2xl:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="flex min-w-0 flex-col gap-5">
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
        </div>

        {/* h-0 + min-h-full: the column contributes nothing to the grid row's
            height (so the left column alone decides it) but then stretches to
            that full height, which is what Activity fills. */}
        <div className="flex min-w-0 flex-col gap-5 xl:h-0 xl:min-h-full">
          {/* Members keeps its natural height; only Activity absorbs the slack. */}
          <div className="xl:shrink-0">
            <MemberPanel
              projectId={project.id}
              members={projectMembers}
              addable={addableMembers}
              canManage={canManage}
            />
          </div>

          {/* grow: fills the leftover sidebar height so its bottom edge lands
              level with the discussion card next to it. */}
          <ActivityFeed
            projectId={project.id}
            initialEntries={activity.entries}
            initialCursor={activity.nextCursor}
            grow
          />
        </div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  /** Adds an "s" for anything but 1 — "1 member", "2 members". */
  plural = false,
}: {
  icon: LucideIcon
  label: string
  value: number
  plural?: boolean
}) {
  const text = plural && value !== 1 ? `${label}s` : label
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 shrink-0 text-zinc-400" />
      <dt className="sr-only">{text}</dt>
      <dd className="flex items-baseline gap-1">
        <span className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{value}</span>
        <span className="text-xs text-zinc-500">{text}</span>
      </dd>
    </div>
  )
}
