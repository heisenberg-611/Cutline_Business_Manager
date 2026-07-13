'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Edit } from 'lucide-react'
import { InvoiceDialog } from './InvoiceDialog'

export function EditInvoiceButton({ invoice, clients, projects, businessCurrency }: { invoice: any, clients: any[], projects: any[], businessCurrency: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="text-zinc-500">
        <Edit className="h-4 w-4 mr-2" /> Edit
      </Button>
      <InvoiceDialog 
        open={open} 
        onOpenChange={setOpen} 
        clients={clients} 
        projects={projects} 
        invoiceId={invoice.id}
        initialData={invoice}
        currency={businessCurrency} 
      />
    </>
  )
}
