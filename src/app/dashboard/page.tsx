import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/modules/core/db/prisma'
import { getStudioHealth, getRevenueTrend } from '@/modules/financials/dashboard-queries'
import { StudioHealthFinanceStrip } from '@/modules/financials/components/StudioHealthFinanceStrip'
import { StageProgressPipeline } from '@/modules/projects/components/StageProgressPipeline'
import { RevenueTrendChart } from '@/modules/financials/components/RevenueTrendChart'
import { UpcomingDeadlines } from '@/modules/projects/components/UpcomingDeadlines'
import { RecentFeedback } from '@/modules/feedback/components/RecentFeedback'
import { Greeting } from '@/components/Greeting'

export const metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const { orgId } = await auth()

  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  // Fetch metrics data and user concurrently
  const [
    studioHealth,
    revenueTrend,
    activeProjects,
    recentFeedback,
    pendingFeedbackCount,
    pendingReviewCount
  ] = await Promise.all([
    getStudioHealth(orgId),
    getRevenueTrend(orgId),
    prisma.project.findMany({
      where: { 
        businessId: orgId,
        isArchived: false,
        NOT: {
          statusStage: {
            name: { contains: 'final', mode: 'insensitive' }
          }
        }
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
          orderBy: { enteredAt: 'desc' }
        },
        client: true 
      },
      orderBy: { createdAt: 'desc' },
      cacheStrategy: { ttl: 30, swr: 30 }
    }),
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
    })
  ])
  
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
            <span>{activeProjects.length} active project{activeProjects.length === 1 ? '' : 's'}</span>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">·</span>
            <span>{pendingFeedbackCount} pending feedback{pendingFeedbackCount === 1 ? '' : 's'}</span>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">·</span>
            <span>{pendingReviewCount} pending revision note{pendingReviewCount === 1 ? '' : 's'}</span>
          </p>
        </div>
      </div>
      
      {/* Studio Health Summary Strip */}
      <StudioHealthFinanceStrip data={studioHealth} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Left Column (2/3 width on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Pipeline */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50">
              <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                Active Pipeline
              </h3>
            </div>
            {activeProjects.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-sm">
                No active projects.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {activeProjects.slice(0, 5).map(project => (
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
            {activeProjects.length > 5 && (
              <div className="px-6 py-3 border-t border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50 text-center">
                <Link href="/dashboard/projects" className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  View all {activeProjects.length} active projects
                </Link>
              </div>
            )}
          </div>

          {/* Revenue Trend Widget */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 overflow-hidden p-6">
            <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100 mb-4">
              Revenue Trend (6 Months)
            </h3>
            <RevenueTrendChart data={revenueTrend} currency={studioHealth.currency} />
          </div>

        </div>

        {/* Right Column (1/3 width on large screens) */}
        <div className="space-y-6">
          
          {/* Upcoming Deadlines Widget */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50">
              <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                Upcoming Deadlines
              </h3>
            </div>
            <UpcomingDeadlines projects={activeProjects} />
          </div>

          {/* Recent Client Feedback Widget */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50">
              <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
                Recent Feedback
              </h3>
            </div>
            <RecentFeedback feedback={recentFeedback} />
          </div>

        </div>
      </div>
    </div>
  )
}
