'use client'

import { Button } from '@/components/ui/button'
import { formatDecimal } from '@/lib/format'
import { Download } from 'lucide-react'
import { format } from 'date-fns'

export function ExportInvoicesButton({ invoices }: { invoices: any[] }) {
  const handleExport = () => {
    if (!invoices.length) return

    const headers = [
      'Invoice ID',
      'Invoice Number',
      'Business ID',
      'Client ID',
      'Client Name',
      'Project ID',
      'Project Title',
      'Status',
      'Currency',
      'Subtotal',
      'Tax Amount',
      'Total',
      'Amount Paid',
      'Amount Due',
      'Issued At',
      'Due Date',
      'Paid At',
      'Created At',
      'Notes'
    ]
    
    const rows = invoices.map(i => {
      return [
        `"${i.id || ''}"`,
        `"${i.invoiceNumber || ''}"`,
        `"${i.businessId || ''}"`,
        `"${i.clientId || ''}"`,
        `"${(i.client?.displayName || '').replace(/"/g, '""')}"`,
        `"${i.projectId || ''}"`,
        `"${(i.project?.title || '').replace(/"/g, '""')}"`,
        `"${i.status || ''}"`,
        `"${i.currency || 'USD'}"`,
        `"${formatDecimal(i.subtotalCents)}"`,
        `"${formatDecimal(i.taxAmountCents)}"`,
        `"${formatDecimal(i.totalCents)}"`,
        `"${formatDecimal(i.amountPaidCents)}"`,
        `"${formatDecimal(i.amountDueCents)}"`,
        i.issuedAt ? format(new Date(i.issuedAt), 'yyyy-MM-dd') : '',
        i.dueDate ? format(new Date(i.dueDate), 'yyyy-MM-dd') : '',
        i.paidAt ? format(new Date(i.paidAt), 'yyyy-MM-dd') : '',
        i.createdAt ? format(new Date(i.createdAt), 'yyyy-MM-dd') : '',
        `"${(i.notes || '').replace(/"/g, '""')}"`
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `invoices-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleExport}
      className="w-full sm:w-auto bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-950 dark:hover:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-800"
    >
      <Download className="w-4 h-4 mr-2" />
      Export
    </Button>
  )
}
