import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/modules/core/db/prisma'
import { getClients } from '@/modules/clients/actions'
import { getProjects } from '@/modules/projects/actions'
import InvoiceBuilder from '@/modules/financials/components/InvoiceBuilder'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const { id } = await params
  
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: orgId },
    include: { lineItems: true }
  })

  if (!invoice) return <div>Invoice not found</div>
  if (invoice.status !== 'DRAFT') return <div>Only draft invoices can be edited</div>

  const clients = await getClients(orgId)
  const projects = await getProjects(orgId)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <Link href={`/dashboard/financials/${id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Edit Invoice {invoice.invoiceNumber}
          </h3>
        </div>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        {/* @ts-ignore */}
        <InvoiceBuilder clients={clients} projects={projects} invoiceId={invoice.id} initialData={invoice} currency={invoice.currency} />
      </div>
    </div>
  )
}
