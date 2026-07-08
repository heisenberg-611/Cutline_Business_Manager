'use client'

import React, { useState } from 'react'
import { createInvoice } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Client = { id: string, displayName: string }
type Project = { id: string, title: string, clientId: string, assets?: { asset: { id: string, name: string, cost: number, type: string } }[] }

export default function InvoiceBuilder({ clients, projects }: { clients: Client[], projects: Project[] }) {
  const router = useRouter()
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [taxRatePct, setTaxRatePct] = useState('0')
  
  const [lineItems, setLineItems] = useState([{ id: 1, description: '', quantity: '1', amount: '' }])
  const [loading, setLoading] = useState(false)

  // Filter projects by selected client
  const availableProjects = projectId && !clientId 
    ? projects
    : projects.filter(p => p.clientId === clientId)

  const handleAddLine = () => {
    setLineItems([...lineItems, { id: Date.now(), description: '', quantity: '1', amount: '' }])
  }

  const handleRemoveLine = (id: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id))
    }
  }

  const handleLineChange = (id: number, field: 'description' | 'amount' | 'quantity', value: string) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const subtotalCents = lineItems.reduce((sum, item) => {
    const qty = parseInt(item.quantity) || 0
    const amt = parseFloat(item.amount) || 0
    return sum + Math.round(qty * amt * 100)
  }, 0)
  
  const taxRateBps = Math.round((parseFloat(taxRatePct) || 0) * 100)
  const taxAmountCents = Math.round(subtotalCents * (taxRateBps / 10000))
  const totalCents = subtotalCents + taxAmountCents

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clientId) return alert("Please select a client")
    if (lineItems.some(i => !i.description || !i.amount)) return alert("Please fill out all line items")

    setLoading(true)
    try {
      const invoice = await createInvoice({
        clientId,
        projectId: projectId || undefined,
        dueDate: dueDate || undefined,
        notes: notes || undefined,
        taxRateBps,
        lineItems: lineItems.map(i => ({
          description: i.description,
          quantity: parseInt(i.quantity) || 1,
          amountCents: Math.round(parseFloat(i.amount) * 100) // Convert to cents
        }))
      })
      router.push(`/dashboard/financials/${invoice.id}`)
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <Label>Client *</Label>
          <Select value={clientId} onValueChange={(val) => {
            setClientId(val || '')
            setProjectId('') // reset project when client changes
          }} required>
            <SelectTrigger>
              <SelectValue placeholder="Select Client">
                {clientId ? clients.find(c => c.id === clientId)?.displayName : ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Project (Optional)</Label>
          <Select value={projectId} onValueChange={(val) => {
            setProjectId(val || '')
            if (val) {
              const proj = projects.find(p => p.id === val)
              if (proj && proj.assets && proj.assets.length > 0) {
                const newLines = proj.assets.map((pa, idx) => ({
                  id: Date.now() + idx,
                  description: `${pa.asset.type}: ${pa.asset.name}`,
                  quantity: '1',
                  amount: (pa.asset.cost / 100).toString()
                }))
                
                // If the only line item is empty, replace it. Otherwise append.
                if (lineItems.length === 1 && !lineItems[0].description && !lineItems[0].amount) {
                  setLineItems(newLines)
                } else {
                  setLineItems([...lineItems, ...newLines])
                }
              }
            }
          }} disabled={!clientId || availableProjects.length === 0}>
            <SelectTrigger>
              <SelectValue placeholder={!clientId ? "Select a client first" : "Select Project"}>
                 {projectId ? projects.find(p => p.id === projectId)?.title : ""}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableProjects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <div className="flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Line Items</h4>
        </div>
        
        {lineItems.map((item, index) => (
          <div key={item.id} className="flex gap-4 items-start">
            <div className="flex-1 space-y-2">
              {index === 0 && <Label className="text-xs text-zinc-500">Description</Label>}
              <Input 
                placeholder="e.g. YouTube Edit - Ep 5" 
                value={item.description}
                onChange={e => handleLineChange(item.id, 'description', e.target.value)}
                required
              />
            </div>
            <div className="w-24 space-y-2">
              {index === 0 && <Label className="text-xs text-zinc-500">Qty</Label>}
              <Input 
                type="number" 
                min="1"
                value={item.quantity}
                onChange={e => handleLineChange(item.id, 'quantity', e.target.value)}
                required
              />
            </div>
            <div className="w-32 space-y-2">
              {index === 0 && <Label className="text-xs text-zinc-500">Rate ($)</Label>}
              <Input 
                type="number" 
                step="0.01"
                min="0"
                placeholder="0.00" 
                value={item.amount}
                onChange={e => handleLineChange(item.id, 'amount', e.target.value)}
                required
              />
            </div>
            <div className="w-32 space-y-2">
              {index === 0 && <Label className="text-xs text-zinc-500">Amount</Label>}
              <div className="h-9 flex items-center justify-end px-3 bg-zinc-50 dark:bg-zinc-900 rounded-md border border-transparent font-medium">
                ${((parseInt(item.quantity) || 0) * (parseFloat(item.amount) || 0)).toFixed(2)}
              </div>
            </div>
            <div className={index === 0 ? "pt-6" : ""}>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleRemoveLine(item.id)}
                disabled={lineItems.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="mt-2 text-xs border-dashed"
          onClick={handleAddLine}
        >
          <Plus className="w-3 h-3 mr-1" /> Add Line
        </Button>
      </div>
      
      <div className="space-y-2">
        <Label>Notes / Payment Instructions</Label>
        <Textarea 
          placeholder="Thank you for your business!" 
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Totals */}
      <div className="flex justify-end pt-6 border-t border-zinc-200 dark:border-zinc-800">
        <div className="w-64 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Subtotal</span>
            <span className="font-medium">${(subtotalCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">Tax (%)</span>
              <Input 
                type="number" 
                className="w-16 h-7 text-xs" 
                value={taxRatePct} 
                onChange={e => setTaxRatePct(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>
            <span className="font-medium">${(taxAmountCents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-zinc-200 dark:border-zinc-800 pt-3">
            <span>Total</span>
            <span>${(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={loading} className="w-40 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
          {loading ? "Saving..." : "Create Invoice"}
        </Button>
      </div>
    </form>
  )
}
