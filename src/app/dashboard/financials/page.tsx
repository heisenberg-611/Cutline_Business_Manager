import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getInvoices } from '@/modules/financials/actions'
import { getAgingReport, getStudioHealth } from '@/modules/financials/dashboard-queries'
import { StudioHealthFinanceStrip } from '@/modules/financials/components/StudioHealthFinanceStrip'
import { AgingBucketsCard } from '@/modules/financials/components/AgingBucketsCard'
import { InvoiceTable } from '@/modules/financials/components/InvoiceTable'

export const metadata = {
  title: 'Financials | Cutline OS',
}

export default async function FinancialsPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const [invoices, studioHealth, agingBuckets] = await Promise.all([
    getInvoices(orgId),
    getStudioHealth(orgId),
    getAgingReport(orgId)
  ])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Financials</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your studio revenue, invoices, and outstanding payments.</p>
        </div>
        <Link href="/dashboard/financials/new">
          <Button className="bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </Link>
      </div>

      <StudioHealthFinanceStrip data={studioHealth} />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">All Invoices</h2>
            <InvoiceTable invoices={invoices as any} />
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <AgingBucketsCard buckets={agingBuckets} />
        </div>
      </div>
    </div>
  )
}
