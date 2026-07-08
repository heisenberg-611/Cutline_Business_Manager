import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const { orgId } = await auth()

  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <h3 className="text-base font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
          Studio Dashboard
        </h3>
        <p className="mt-2 max-w-4xl text-sm text-zinc-500">
          Welcome to your Cutline dashboard. Here you can see a high-level overview of your studio health.
        </p>
      </div>
      
      {/* Placeholder Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-zinc-900 overflow-hidden rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="text-sm font-medium text-zinc-500">Active Projects</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">12</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 overflow-hidden rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="text-sm font-medium text-zinc-500">Overdue Invoices</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-red-600 dark:text-red-400">3</div>
        </div>
        <div className="bg-white dark:bg-zinc-900 overflow-hidden rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="text-sm font-medium text-zinc-500">At-Risk Deadlines</div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-500">1</div>
        </div>
      </div>
    </div>
  )
}
