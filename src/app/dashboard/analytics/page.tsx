import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { AnalyticsDashboard } from '@/modules/analytics/components/AnalyticsDashboard'

export const metadata = {
  title: 'Analytics',
}

export default async function AnalyticsPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  return (
    <div className="container py-8 w-full mx-auto h-[calc(100vh-4rem)] overflow-y-auto">
      <AnalyticsDashboard />
    </div>
  )
}
