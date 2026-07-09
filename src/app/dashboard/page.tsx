import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/modules/core/db/prisma'
import { format } from 'date-fns'
import { getStudioHealth } from '@/modules/financials/dashboard-queries'
import { StudioHealthFinanceStrip } from '@/modules/financials/components/StudioHealthFinanceStrip'

export default async function DashboardPage() {
  const { orgId } = await auth()

  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  // Fetch metrics data
  const [projects, invoices, studioHealth] = await Promise.all([
    prisma.project.findMany({
      where: { businessId: orgId },
      include: { statusStage: true, client: true },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.invoice.findMany({
      where: { businessId: orgId }
    }),
    getStudioHealth(orgId)
  ])

  const activeProjectsCount = projects.filter(p => !p.statusStage?.name.toLowerCase().includes('final') && !p.statusStage?.name.toLowerCase().includes('archive')).length

  const formatCurrency = (cents: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol'
    }).format(cents / 100)
  }

  // Check for at-risk deadlines (due within 3 days or already past due, and not in final stage)
  const now = new Date()
  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(now.getDate() + 3)

  const atRiskProjectsCount = projects.filter(p => {
    if (!p.deadline) return false
    const isFinal = p.statusStage?.name.toLowerCase().includes('final') || p.statusStage?.name.toLowerCase().includes('archive')
    if (isFinal) return false
    
    return p.deadline <= threeDaysFromNow
  }).length

  const recentProjects = projects.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 dark:border-white/10 pb-5">
        <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
          Studio Dashboard
        </h3>
        <p className="mt-2 max-w-4xl text-sm text-zinc-500">
          Welcome to your Cutline OS dashboard. Here is a high-level overview of your business health.
        </p>
      </div>
      
      {/* Finance Strip */}
      <h4 className="font-medium text-sm text-zinc-500 uppercase tracking-wider mb-4">Financial Health</h4>
      <StudioHealthFinanceStrip data={studioHealth} />

      {/* Project Metrics */}
      <h4 className="font-medium text-sm text-zinc-500 uppercase tracking-wider mb-4 mt-8">Project Health</h4>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
        <div className="bg-white dark:bg-zinc-900 overflow-hidden rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 p-6">
          <div className="text-sm font-medium text-zinc-500">Active Projects</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{activeProjectsCount}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 overflow-hidden rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 p-6">
          <div className="text-sm font-medium text-zinc-500">At-Risk Deadlines</div>
          <div className={`mt-2 text-3xl font-bold tracking-tight ${atRiskProjectsCount > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {atRiskProjectsCount}
          </div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="mt-8 bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-white/10 overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950/50">
          <h3 className="text-sm font-medium leading-6 text-zinc-900 dark:text-zinc-100">
            Recent Projects
          </h3>
        </div>
        {recentProjects.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-sm">
            No projects yet.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {recentProjects.map(project => (
              <li key={project.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <Link href={`/dashboard/projects/${project.id}`} className="flex justify-between items-center w-full">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{project.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">{project.client.displayName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                      {project.statusStage?.name || 'Unassigned'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
