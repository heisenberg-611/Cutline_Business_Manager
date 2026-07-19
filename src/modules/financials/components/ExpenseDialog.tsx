'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createExpense, updateExpense } from '../expense-actions'
import { Loader2 } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: any | null
  projects: { id: string, title: string }[]
  businessCurrency?: string
}

export function ExpenseDialog({ open, onOpenChange, expense, projects, businessCurrency = 'USD' }: Props) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!expense

  const [formData, setFormData] = useState({
    description: '',
    category: '',
    amountStr: '',
    dateIncurred: new Date().toISOString().split('T')[0],
    projectId: 'none'
  })

  useEffect(() => {
    if (open) {
      if (expense) {
        setFormData({
          description: expense.description || '',
          category: expense.category || '',
          amountStr: (expense.amountCents / 100).toString(),
          dateIncurred: new Date(expense.dateIncurred).toISOString().split('T')[0],
          projectId: expense.projectId || 'none'
        })
      } else {
        setFormData({
          description: '',
          category: '',
          amountStr: '',
          dateIncurred: new Date().toISOString().split('T')[0],
          projectId: 'none'
        })
      }
    }
  }, [open, expense])

  const notify = (title: string, description?: string) => {
    window.alert(description ? `${title}\n${description}` : title)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.description || !formData.category || !formData.amountStr || !formData.dateIncurred) {
      notify('Please fill in all required fields.')
      return
    }

    const amount = parseFloat(formData.amountStr)
    if (isNaN(amount) || amount < 0) {
      notify('Invalid amount')
      return
    }

    try {
      setLoading(true)
      const input = {
        description: formData.description,
        category: formData.category,
        amountCents: Math.round(amount * 100),
        dateIncurred: formData.dateIncurred,
        projectId: formData.projectId === 'none' ? null : formData.projectId,
        currency: expense?.currency ?? businessCurrency
      }

      if (isEditing) {
        await updateExpense(expense.id, input)
        notify('Expense updated')
      } else {
        await createExpense(input)
        notify('Expense logged')
      }
      onOpenChange(false)
    } catch (err: any) {
      notify('Error', err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 sm:max-w-[425px] w-[95vw] sm:w-full max-h-[90dvh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Log Expense'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the details of this expense.' : 'Record a new business expense.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Input 
              id="description" 
              placeholder="e.g. Adobe Creative Cloud" 
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
            <Input 
              id="category" 
              placeholder="e.g. Software, Travel, Contractor" 
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ({businessCurrency}) <span className="text-red-500">*</span></Label>
              <Input 
                id="amount" 
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00" 
                value={formData.amountStr}
                onChange={e => setFormData({ ...formData, amountStr: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateIncurred">Date <span className="text-red-500">*</span></Label>
              <Input 
                id="dateIncurred" 
                type="date"
                value={formData.dateIncurred}
                onChange={e => setFormData({ ...formData, dateIncurred: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Link to Project (Optional)</Label>
            <Select 
              value={formData.projectId} 
              onValueChange={val => setFormData({ ...formData, projectId: val ?? 'none' })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a project">
                  <div className="truncate text-left max-w-[280px] sm:max-w-[320px]">
                    {formData.projectId === 'none'
                      ? 'No Project'
                      : projects.find(project => project.id === formData.projectId)?.title}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                <SelectItem value="none">No Project</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="truncate max-w-[320px]">{p.title}</div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <Button type="button" variant="outline" className="w-full sm:w-auto order-2 sm:order-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto order-1 sm:order-2 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
