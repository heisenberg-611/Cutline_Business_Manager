'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { InvoiceDialog } from './InvoiceDialog'

export function NewInvoiceButton({ clients, projects, businessCurrency }: { clients: any[], projects: any[], businessCurrency: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90">
        <Plus className="mr-2 h-4 w-4" />
        New Invoice
      </Button>
      <InvoiceDialog 
        open={open} 
        onOpenChange={setOpen} 
        clients={clients} 
        projects={projects} 
        currency={businessCurrency} 
      />
    </>
  )
}
