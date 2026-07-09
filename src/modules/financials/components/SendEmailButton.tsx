'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { sendInvoice } from '../actions'
import { Mail, Loader2 } from 'lucide-react'

export function SendEmailButton({ invoiceId, disabled }: { invoiceId: string, disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()
  
  const handleSend = () => {
    startTransition(async () => {
      try {
        await sendInvoice(invoiceId)
        alert('Invoice email sent successfully!')
      } catch (e: any) {
        alert(e.message)
      }
    })
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleSend} 
      disabled={disabled || isPending}
      className="h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      title="Send Email"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
    </Button>
  )
}
