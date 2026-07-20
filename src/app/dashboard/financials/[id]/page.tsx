import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/modules/core/db/prisma'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Mail, Ban, Edit, Check, ExternalLink } from 'lucide-react'
import { RecordPaymentDialog } from '@/modules/financials/components/RecordPaymentDialog'
import { sendInvoice, deleteInvoice } from '@/modules/financials/actions'
import { getClients } from '@/modules/clients/actions'
import { EditInvoiceButton } from '@/modules/financials/components/EditInvoiceButton'
import { Badge } from '@/components/ui/badge'
import { getInvoiceDataForPdf } from '@/lib/invoices/pdf-data'
import { DownloadInvoiceButton } from '@/components/invoices/DownloadInvoiceButton'
import { PreviewInvoiceDialog } from '@/modules/financials/components/PreviewInvoiceDialog'

const formatMoney = (cents: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol'
  }).format(cents / 100)
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await auth()
  if (!orgId) redirect('/dashboard/select-business')

  const { id } = await params

  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: orgId },
    include: {
      client: true,
      lineItems: true,
      payments: { orderBy: { createdAt: 'desc' } }
    }
  })

  if (!invoice) return <div>Invoice not found</div>

  // Get the type-safe InvoiceData for the PDF template.
  // This is fetched alongside the main invoice query because:
  //   1. The detail page needs the raw invoice for its own UI.
  //   2. The DownloadInvoiceButton (client component) needs the mapped InvoiceData.
  // Both queries filter by businessId — no IDOR possible.
  // Both queries filter by businessId — no IDOR possible.
  const invoiceDataForPdf = await getInvoiceDataForPdf(id, orgId)

  const [clients, projects] = await Promise.all([
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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-start md:items-center gap-4">
          <Link href="/dashboard/financials" className="mt-1 md:mt-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-2 md:gap-3">
              <span className="break-all">Invoice {invoice.invoiceNumber}</span>
              <Badge variant="outline">{invoice.status}</Badge>
            </h3>
            <p className="text-sm text-zinc-500 mt-1">{invoice.client.displayName}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto [&>*]:w-full sm:[&>*]:w-auto [&_button]:w-full sm:[&_button]:w-auto">
          {invoice.status === 'DRAFT' && (
            <EditInvoiceButton
              invoice={invoice}
              clients={clients}
              projects={projects}
              businessCurrency={invoice.currency}
            />
          )}

          {invoice.status === 'DRAFT' && (
            <form action={async () => {
              'use server'
              await sendInvoice(invoice.id)
            }} className="w-full sm:w-auto">
              <Button type="submit" variant="outline" className="text-zinc-500 w-full sm:w-auto">
                {invoice.client.email ? (
                  <><Mail className="h-4 w-4 mr-2" /> Mark as Sent</>
                ) : (
                  <><Check className="h-4 w-4 mr-2" /> Mark as Sent (No Email)</>
                )}
              </Button>
            </form>
          )}

          <form action={async () => {
            'use server'
            await deleteInvoice(invoice.id)
          }} className="w-full sm:w-auto">
            <Button type="submit" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 w-full sm:w-auto">
              <Ban className="h-4 w-4 mr-2" /> Delete
            </Button>
          </form>

          {/* Client-side instant download (generates PDF in browser) */}
          {invoiceDataForPdf && (
            <div className="w-full sm:w-auto">
              <DownloadInvoiceButton invoiceData={invoiceDataForPdf} />
            </div>
          )}

          {/* In-app PDF Viewer Modal */}
          {invoiceDataForPdf && (
            <div className="w-full sm:w-auto">
              <PreviewInvoiceDialog invoiceData={invoiceDataForPdf} />
            </div>
          )}

          {['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && invoice.amountDueCents > 0 && (
            <div className="w-full sm:w-auto">
              <RecordPaymentDialog invoiceId={invoice.id} amountDueCents={invoice.amountDueCents} currency={invoice.currency} />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="md:col-span-2 xl:col-span-3 space-y-6">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h4 className="font-semibold mb-4">Line Items</h4>
            <div className="space-y-4">
              {invoice.lineItems.map(item => (
                <div key={item.id} className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-900 pb-4 last:border-0">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-zinc-500">{item.quantity} x {formatMoney(item.amountCents, invoice.currency)}</p>
                  </div>
                  <div className="font-medium">
                    {formatMoney(item.amountCents * item.quantity, invoice.currency)}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-zinc-200 dark:border-zinc-800 mt-6 pt-6 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span>{formatMoney(invoice.subtotalCents, invoice.currency)}</span>
              </div>
              {invoice.taxAmountCents > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>Tax</span>
                  <span>{formatMoney(invoice.taxAmountCents, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-zinc-900 dark:text-zinc-100 pt-2">
                <span>Total</span>
                <span>{formatMoney(invoice.totalCents, invoice.currency)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 md:col-span-1 xl:col-span-1">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h4 className="font-semibold mb-4">Payment Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Amount Paid</span>
                <span className="font-medium text-green-600">{formatMoney(invoice.amountPaidCents, invoice.currency)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-zinc-100 dark:border-zinc-900 pt-3">
                <span className="text-zinc-500 font-medium">Balance Due</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatMoney(invoice.amountDueCents, invoice.currency)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h4 className="font-semibold mb-4">Recent Payments</h4>
            {invoice.payments.length === 0 ? (
              <p className="text-sm text-zinc-500">No payments recorded.</p>
            ) : (
              <div className="space-y-4">
                {invoice.payments.map(payment => (
                  <div key={payment.id} className="text-sm border-b border-zinc-100 dark:border-zinc-900 pb-3 last:border-0">
                    <div className="flex justify-between font-medium">
                      <span>{payment.method}</span>
                      <span>{formatMoney(payment.amountCents, invoice.currency)}</span>
                    </div>
                    <p className="text-zinc-500 text-xs mt-1">
                      {new Date(payment.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    {payment.reference && <p className="text-zinc-500 text-xs mt-1">Ref: {payment.reference}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
