import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { getInvoices } from '@/modules/financials/actions'
import { getExpenses } from '@/modules/financials/expense-actions'
import { getClients } from '@/modules/clients/actions'
import { NewInvoiceButton } from '@/modules/financials/components/NewInvoiceButton'
import { getAgingReport, getStudioHealth } from '@/modules/financials/dashboard-queries'
import { StudioHealthFinanceStrip } from '@/modules/financials/components/StudioHealthFinanceStrip'
import { AgingBucketsCard } from '@/modules/financials/components/AgingBucketsCard'
import { InvoiceTable } from '@/modules/financials/components/InvoiceTable'
import { ExpenseTable } from '@/modules/financials/components/ExpenseTable'
import { ExportInvoicesButton } from '@/modules/financials/components/ExportInvoicesButton'
import { FinancialsTimeframeOverview } from '@/modules/financials/components/FinancialsTimeframeOverview'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import prisma from '@/modules/core/db/prisma'

export const metadata = {
  title: 'Finance',
}

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { orgId } = await auth()
  const resolvedSearchParams = await searchParams
  const activeTab = resolvedSearchParams.tab === 'expenses' ? 'expenses' : 'invoices'
  const shouldOpenNewExpense = activeTab === 'expenses' && resolvedSearchParams.newExpense === '1'
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const [invoices, expenses, studioHealth, agingBuckets, clients, projects] = await Promise.all([
    getInvoices(orgId),
    getExpenses(orgId),
    getStudioHealth(orgId),
    getAgingReport(orgId),
    getClients(orgId),
    prisma.project.findMany({
      where: { businessId: orgId, isArchived: false },
      select: { 
        id: true, 
        title: true,
        clientId: true,
        assets: {
          select: {
            asset: { select: { id: true, name: true, cost: true, type: true } }
          }
        }
      }
    })
  ])

  return (
    <div className="w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Financials</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your studio revenue, expenses, and outstanding payments.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <ExportInvoicesButton invoices={invoices} />
          <NewInvoiceButton 
            clients={clients} 
            projects={projects} 
            businessCurrency={studioHealth.currency || 'USD'} 
          />
        </div>
      </div>

      <StudioHealthFinanceStrip data={studioHealth} variant="finance" />

      <Tabs key={activeTab} defaultValue={activeTab} className="w-full">
        <TabsList className="mb-4 w-full sm:w-fit">
          <TabsTrigger value="invoices" className="text-xs sm:text-sm">Invoices & Revenue</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs sm:text-sm">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-0">
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
        </TabsContent>

        <TabsContent value="expenses" className="mt-0">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <ExpenseTable
              expenses={expenses as any}
              projects={projects}
              openNewExpense={shouldOpenNewExpense}
              businessCurrency={studioHealth.currency || 'USD'}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
