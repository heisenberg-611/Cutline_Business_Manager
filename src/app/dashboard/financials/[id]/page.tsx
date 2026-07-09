import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import prisma from '@/modules/core/db/prisma'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Mail, Ban, Edit } from 'lucide-react'
import { RecordPaymentDialog } from '@/modules/financials/components/RecordPaymentDialog'
import { sendInvoice, deleteInvoice } from '@/modules/financials/actions'
import { Badge } from '@/components/ui/badge'
import { getInvoiceDataForPdf } from '@/lib/invoices/pdf-data'
import { DownloadInvoiceButton } from '@/components/invoices/DownloadInvoiceButton'

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
  const invoiceDataForPdf = await getInvoiceDataForPdf(id, orgId)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/financials">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
              Invoice {invoice.invoiceNumber}
              <Badge variant="outline">{invoice.status}</Badge>
            </h3>
            <p className="text-sm text-zinc-500 mt-1">{invoice.client.displayName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {invoice.status === 'DRAFT' && (
            <Link href={`/dashboard/financials/${invoice.id}/edit`}>
              <Button variant="outline" className="text-zinc-500">
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            </Link>
          )}
          
          {invoice.status === 'DRAFT' && (
            <form action={async () => {
              'use server'
              await sendInvoice(invoice.id)
            }}>
              <Button type="submit" variant="outline" className="text-zinc-500">
                <Mail className="h-4 w-4 mr-2" /> Mark as Sent
              </Button>
            </form>
          )}

          <form action={async () => {
            'use server'
            await deleteInvoice(invoice.id)
          }}>
            <Button type="submit" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
              <Ban className="h-4 w-4 mr-2" /> Delete
            </Button>
          </form>
          
          {/* Client-side instant download (generates PDF in browser) */}
          {invoiceDataForPdf && (
            <DownloadInvoiceButton invoiceData={invoiceDataForPdf} />
          )}
          
          {/* Fallback: server-side PDF (opens in new tab via API route) */}
          <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" className="text-zinc-400 text-xs">
              Open PDF
            </Button>
          </a>
          
          {['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status) && invoice.amountDueCents > 0 && (
            <RecordPaymentDialog invoiceId={invoice.id} amountDueCents={invoice.amountDueCents} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
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

        <div className="space-y-6">
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
