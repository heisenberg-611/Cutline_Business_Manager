import prisma from '@/modules/core/db/prisma'
import { notFound } from 'next/navigation'
import React from 'react'

export default async function InvoicePayPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  
  const invoice = await prisma.invoice.findUnique({
    where: { id: resolvedParams.id },
    include: {
      business: true,
      client: true,
      lineItems: true
    }
  })

  if (!invoice) notFound()

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: invoice.currency,
    currencyDisplay: 'narrowSymbol'
  })

  const amountDueFormatted = formatter.format(invoice.amountDueCents / 100)
  const isPaid = invoice.status === 'PAID'
  
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-2xl space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {invoice.business.name}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Invoice {invoice.invoiceNumber}
          </p>
        </div>

        {/* Invoice Summary Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Billed To</p>
              <p className="text-zinc-900 dark:text-zinc-100 font-medium">{invoice.client.displayName}</p>
              {invoice.client.companyName && (
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">{invoice.client.companyName}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Amount Due</p>
              <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {isPaid ? '$0.00' : amountDueFormatted}
              </p>
              {isPaid && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 mt-2">
                  Paid in full
                </span>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-8">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Payment Instructions</h2>
            
            {isPaid ? (
              <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-lg text-sm">
                This invoice has been successfully paid. Thank you!
              </div>
            ) : (
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
                <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {invoice.business.paymentInstructions || "No payment instructions provided. Please contact the business."}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          Powered by securely generated <span className="font-semibold text-zinc-900 dark:text-zinc-300">Cutline OS</span> invoices.
        </div>
      </div>
    </div>
  )
}
