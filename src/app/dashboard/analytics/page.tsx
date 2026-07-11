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
    <AnalyticsDashboard />
  )
}
