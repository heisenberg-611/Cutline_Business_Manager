import React from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { SendEmailButton } from './SendEmailButton'

interface Invoice {
  id: string
  invoiceNumber: string
  status: string
  totalCents: number
  amountDueCents: number
  currency: string
  issuedAt: Date | null
  dueDate: Date | null
  client: {
    displayName: string
  }
}

interface Props {
  invoices: Invoice[]
}

const formatMoney = (cents: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol'
  }).format(cents / 100)
}

const formatDate = (date: Date | null) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'DRAFT':
      return <Badge variant="secondary" className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-100">Draft</Badge>
    case 'SENT':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100">Sent</Badge>
    case 'PARTIALLY_PAID':
      return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 hover:bg-yellow-100">Partial</Badge>
    case 'PAID':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">Paid</Badge>
    case 'OVERDUE':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100">Overdue</Badge>
    case 'VOID':
      return <Badge variant="outline" className="text-zinc-500">Void</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function InvoiceTable({ invoices }: Props) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Issued</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Due</TableHead>
            <TableHead className="text-right w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-zinc-500">
                No invoices found
              </TableCell>
            </TableRow>
          ) : (
            invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  <Link href={`/dashboard/financials/${invoice.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                    {invoice.invoiceNumber || 'Draft'}
                  </Link>
                </TableCell>
                <TableCell>{invoice.client.displayName}</TableCell>
                <TableCell>{formatDate(invoice.issuedAt)}</TableCell>
                <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="text-right">{formatMoney(invoice.totalCents, invoice.currency)}</TableCell>
                <TableCell className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                  {formatMoney(invoice.amountDueCents, invoice.currency)}
                </TableCell>
                <TableCell className="text-right">
                  <SendEmailButton invoiceId={invoice.id} disabled={invoice.status !== 'DRAFT'} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
