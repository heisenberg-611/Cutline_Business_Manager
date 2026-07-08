import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { ReportsDashboard } from '@/modules/reports/components/ReportsDashboard'

export default async function ReportsPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Reports & Analytics</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          Analyze your work output and financial performance over time.
        </p>
      </div>

      <ReportsDashboard />
    </div>
  )
}
