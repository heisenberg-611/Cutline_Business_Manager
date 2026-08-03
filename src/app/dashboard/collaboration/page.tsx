import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/modules/core/db/prisma'
import { canUseTeamCollaboration, getActivePlan } from '@/lib/subscription'
import { visibleProjectFilter } from '@/modules/projects/authz'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, MessageSquare, Users2, Handshake, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Collaboration' }

export default async function CollaborationPage() {
  const { orgId, userId, orgRole } = await auth()

  if (!orgId || !userId) {
    redirect('/dashboard/select-business')
  }

  const business = await prisma.business.findUnique({
    where: { id: orgId },
    select: { subscriptionPlan: true, subscriptionPeriodEnd: true },
  })

  if (!business || !canUseTeamCollaboration(getActivePlan(business))) {
    return <UpgradeNotice />
  }

  const isAdmin = orgRole === 'org:admin'

  // Admins see the whole board; everyone else sees only projects they are a
  // member of, matching how authorizeProjectAccess resolves access.
  const projects = await prisma.project.findMany({
    where: {
      businessId: orgId,
      isArchived: false,
      ...(isAdmin ? {} : visibleProjectFilter(userId)),
    },
    select: {
      id: true,
      displayId: true,
      title: true,
      client: { select: { displayName: true } },
      statusStage: { select: { name: true } },
      _count: { select: { members: true, tasks: true } },
      tasks: { where: { status: { not: 'DONE' } }, select: { id: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Comments are polymorphic with no FK, so counts come from one grouped query
  // rather than a relation include.
  const commentCounts = await prisma.comment.groupBy({
    by: ['entityId'],
    where: {
      businessId: orgId,
      entityType: 'Project',
      deletedAt: null,
      entityId: { in: projects.map((p) => p.id) },
    },
    _count: { entityId: true },
  })
  const commentsByProject = new Map<string, number>(
    commentCounts.map((c) => [c.entityId, c._count.entityId])
  )

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h3 className="text-2xl font-bold leading-6 text-zinc-900 dark:text-zinc-100">
          Collaboration
        </h3>
        <p className="mt-2 text-sm text-zinc-500">
          Tasks, discussion and activity for the projects you work on.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <Handshake className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-3 text-sm text-zinc-500">
            {isAdmin
              ? 'No active projects yet. Create one to start collaborating.'
              : 'You are not a member of any active project yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/dashboard/collaboration/${project.id}`}
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate font-semibold text-zinc-900 dark:text-zinc-100">
                    {project.title}
                  </h4>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {project.client?.displayName}
                  </p>
                </div>
                {project.displayId && (
                  <Badge variant="outline" className="shrink-0 text-[10px]">
                    {project.displayId}
                  </Badge>
                )}
              </div>

              {project.statusStage && (
                <span className="mt-3 w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {project.statusStage.name}
                </span>
              )}

              <div className="mt-4 flex items-center gap-4 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" />
                  {project.tasks.length} open
                </span>
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {commentsByProject.get(project.id) ?? 0}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users2 className="h-3.5 w-3.5" />
                  {project._count.members}
                </span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function UpgradeNotice() {
  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <h3 className="text-2xl font-bold leading-6 text-zinc-900 dark:text-zinc-100">
          Collaboration
        </h3>
      </div>
      <div className="rounded-xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <Handshake className="mx-auto h-8 w-8 text-zinc-400" />
        <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Team collaboration is a Business plan feature
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Upgrade to give your team shared tasks, discussion and activity on every project.
        </p>
        <Link
          href="/dashboard/settings"
          className="mt-4 inline-block text-sm font-medium text-zinc-900 underline dark:text-zinc-100"
        >
          View plans
        </Link>
      </div>
    </div>
  )
}
