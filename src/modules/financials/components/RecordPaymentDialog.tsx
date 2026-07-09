'use client'

import React, { useState } from 'react'
import { recordPayment } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

export function RecordPaymentDialog({ invoiceId, amountDueCents }: { invoiceId: string, amountDueCents: number }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState((amountDueCents / 100).toFixed(2))
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [reference, setReference] = useState('')
  
  // Format for datetime-local: YYYY-MM-DDThh:mm
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  const localIso = new Date(now.getTime() - offset).toISOString().slice(0, 16)
  const [paymentDate, setPaymentDate] = useState(localIso)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await recordPayment(invoiceId, {
        amountCents: Math.round(parseFloat(amount) * 100),
        method: method as any,
        reference: reference || null,
        paidAt: new Date(paymentDate).toISOString()
      })
      setOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90">
        Record Payment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Amount ($)</Label>
            <Input 
              type="number" 
              step="0.01" 
              min="0.01" 
              max={(amountDueCents / 100).toFixed(2)} 
              value={amount} 
              onChange={e => setAmount(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label>Date and Time</Label>
            <Input 
              type="datetime-local" 
              value={paymentDate} 
              onChange={e => setPaymentDate(e.target.value)} 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={v => setMethod(v || 'BANK_TRANSFER')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="CHECK">Check</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference (Optional)</Label>
            <Input 
              placeholder="e.g. Stripe TX_123 or Check #1002" 
              value={reference} 
              onChange={e => setReference(e.target.value)} 
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-zinc-900 text-zinc-50">
              {loading ? 'Saving...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
