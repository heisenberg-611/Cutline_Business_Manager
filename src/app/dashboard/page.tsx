import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/modules/core/db/prisma'
import { getStudioHealth, getRevenueTrend, getOutstandingInvoices } from '@/modules/financials/dashboard-queries'
import { StudioHealthFinanceStrip } from '@/modules/financials/components/StudioHealthFinanceStrip'
import { AgingBucketsCard } from '@/modules/financials/components/AgingBucketsCard'
import { StageProgressPipeline } from '@/modules/projects/components/StageProgressPipeline'
import { RevenueTrendChart } from '@/modules/financials/components/RevenueTrendChart'
import { UpcomingDeadlines } from '@/modules/projects/components/UpcomingDeadlines'
import { RecentFeedback } from '@/modules/feedback/components/RecentFeedback'
import { Greeting } from '@/components/Greeting'

export const metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const { orgId, userId, orgRole } = await auth()
  const isAdmin = orgRole === 'org:admin'

  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const activeProjectWhere = { 
    businessId: orgId,
    isArchived: false,
    ...(isAdmin ? {} : { assigneeId: userId }),
    NOT: {
      statusStage: {
        name: { contains: 'final', mode: 'insensitive' }
      }
    }
  }

  // Fetch targeted data concurrently
  const [activeProjectsCount, pipelineProjects, upcomingDeadlineProjects] = await Promise.all([
    prisma.project.count({
      where: activeProjectWhere,
      cacheStrategy: { ttl: 30, swr: 30 }
    }),
    prisma.project.findMany({
      where: activeProjectWhere,
      include: { 
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
        },
        client: true 
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      cacheStrategy: { ttl: 30, swr: 30 }
    }),
    prisma.project.findMany({
      where: {
        ...activeProjectWhere,
        deadline: { gte: new Date() }
      },
      include: { 
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
        },
        client: true 
      },
      orderBy: { deadline: 'asc' },
      take: 5,
      cacheStrategy: { ttl: 30, swr: 30 }
    })
  ])

  // Admin-only fetches
  let studioHealth: any = null
  let revenueTrend: any[] = []
  let recentFeedback: any[] = []
  let pendingFeedbackCount = 0
  let pendingReviewCount = 0
  let pendingProjectRequests: any[] = []
  let agingBuckets: any = null

  if (isAdmin) {
    const adminData = await Promise.all([
      getStudioHealth(orgId),
      getRevenueTrend(orgId),
      prisma.feedbackResponse.findMany({
        where: { businessId: orgId },
        include: {
          request: {
            include: {
              project: true,
              client: true
            }
          }
        },
        orderBy: { submittedAt: 'desc' },
        take: 3,
        cacheStrategy: { ttl: 30, swr: 30 }
      }),
      prisma.feedbackRequest.count({
        where: { 
          businessId: orgId, 
          status: 'COMPLETED',
          response: { isNot: null }
        },
        cacheStrategy: { ttl: 30, swr: 30 }
      }),
      prisma.reviewRequest.count({
        where: { businessId: orgId, status: 'REPLIED' },
        cacheStrategy: { ttl: 30, swr: 30 }
      }),
      prisma.projectRequest.findMany({
        where: { businessId: orgId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' }
      }),
      getOutstandingInvoices(orgId)
    ])
    
    studioHealth = adminData[0]
    revenueTrend = adminData[1]
    recentFeedback = adminData[2]
    pendingFeedbackCount = adminData[3]
    pendingReviewCount = adminData[4]
    pendingProjectRequests = adminData[5]
    agingBuckets = adminData[6]
  }

  const today = new Date()
  const dateString = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(today)

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 dark:border-white/10 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold leading-7 text-zinc-900 dark:text-zinc-100">
            <Greeting />
          </h3>
          <p className="mt-2 text-sm text-zinc-500 flex items-center flex-wrap gap-2">
            <span>{dateString}</span>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">·</span>
            <span>{activeProjectsCount} active project{activeProjectsCount === 1 ? '' : 's'}{!isAdmin && ' assigned to you'}</span>
            
            {isAdmin && (
              <>
                <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">·</span>
                <span>{pendingFeedbackCount} pending feedback{pendingFeedbackCount === 1 ? '' : 's'}</span>
                <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">·</span>
                <span>{pendingReviewCount} pending revision note{pendingReviewCount === 1 ? '' : 's'}</span>
              </>
            )}
          </p>
        </div>
      </div>
      
      {/* Studio Health Summary Strip */}
      {isAdmin && studioHealth && <StudioHealthFinanceStrip data={studioHealth} />}

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row gap-6 mt-8 items-start">
        
        {/* Left Column (2/3 width on large screens) */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6">
          
          {/* Pending Project Requests */}
          {isAdmin && pendingProjectRequests.length > 0 && (
            <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-xl shadow-sm border border-amber-200 dark:border-amber-900/50 overflow-hidden w-full">
              <div className="px-6 py-5 border-b border-amber-200 dark:border-amber-900/50 bg-amber-100/50 dark:bg-amber-900/20 flex justify-between items-center">
                <h3 className="text-sm font-medium leading-6 text-amber-900 dark:text-amber-500">
                  New Project Requests ({pendingProjectRequests.length})
                </h3>
                <Link href="/dashboard/projects" className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 transition-colors">
                  Review All
                </Link>
              </div>
              <ul className="divide-y divide-amber-200 dark:divide-amber-900/50">
                {pendingProjectRequests.slice(0, 5).map(request => (
                  <li key={request.id} className="p-5">
                    <Link href={`/dashboard/projects`} className="block group">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-amber-900 dark:text-amber-100 group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">{request.projectTitle}</p>
                          <p className="text-xs text-amber-700/70 dark:text-amber-500/70 mt-0.5">{request.clientName}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
                          {request.projectType || 'Standard'}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Active Pipeline */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 overflow-hidden w-full">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50">
              <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                {isAdmin ? 'Active Pipeline' : 'Your Assigned Projects'}
              </h3>
            </div>
            {activeProjectsCount === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                {isAdmin ? 'No active projects.' : 'You have no active projects assigned to you.'}
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {pipelineProjects.map(project => (
                  <li key={project.id} className="p-5">
                    <Link href={`/dashboard/projects/${project.id}`} className="block group">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-primary transition-colors">{project.title}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{project.client.displayName}</p>
                        </div>
                      </div>
                      <StageProgressPipeline project={project} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {activeProjectsCount > 5 && (
              <div className="px-6 py-3 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50 text-center">
                <Link href="/dashboard/projects" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  View all {activeProjectsCount} active projects
                </Link>
              </div>
            )}
          </div>

          {/* Revenue Trend Widget */}
          {isAdmin && revenueTrend && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 overflow-hidden p-6 w-full flex flex-col">
              <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100 mb-4">
                Revenue Trend (6 Months)
              </h3>
              <div className="flex-1 w-full overflow-hidden">
                <RevenueTrendChart data={revenueTrend} currency={studioHealth?.currency || 'USD'} />
              </div>
            </div>
          )}
          
        </div>

        {/* Right Column (1/3 width on large screens) */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          
          {/* Upcoming Deadlines Widget */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 overflow-hidden w-full">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50">
              <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                Upcoming Deadlines
              </h3>
            </div>
            <UpcomingDeadlines projects={upcomingDeadlineProjects} />
          </div>

          {/* Aging Outstanding Invoices */}
          {isAdmin && agingBuckets && (
            <AgingBucketsCard buckets={agingBuckets} />
          )}

          {/* Recent Client Feedback Widget */}
          {isAdmin && recentFeedback && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 overflow-hidden w-full flex flex-col">
              <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50">
                <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                  Recent Feedback
                </h3>
              </div>
              <div className="flex-1 w-full overflow-hidden">
                <RecentFeedback feedback={recentFeedback} />
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  )
}
