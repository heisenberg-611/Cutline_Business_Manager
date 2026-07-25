'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Receipt, Search, FileText, ChevronDown, Check, FolderKanban, MoreHorizontal, Trash, Edit2 } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { deleteExpense } from '../expense-actions'
import { ExpenseDialog } from './ExpenseDialog'
import { Plus } from "lucide-react"

interface Expense {
  id: string
  description: string | null
  category: string
  amountCents: number
  currency: string
  dateIncurred: Date
  projectId: string | null
  project?: { title: string } | null
}

interface Props {
  expenses: Expense[]
  projects: { id: string, title: string }[]
  openNewExpense?: boolean
  businessCurrency?: string
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

export function ExpenseTable({ expenses, projects, openNewExpense = false, businessCurrency = 'USD' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isCreating, setIsCreating] = useState(openNewExpense)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (openNewExpense) {
      setIsCreating(true)
    }
  }, [openNewExpense])

  const notify = (title: string, description?: string) => {
    window.alert(description ? `${title}\n${description}` : title)
  }

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(id)
      await deleteExpense(id)
      notify('Expense deleted successfully')
    } catch (err: any) {
      notify('Error', err.message)
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">All Expenses</h2>
        <Button onClick={() => setIsCreating(true)} className="bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90">
          <Plus className="mr-2 h-4 w-4" />
          Log Expense
        </Button>
      </div>

      {/* Mobile Card Layout */}
      <div className="grid grid-cols-1 gap-4 md:hidden mb-6">
        {expenses.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            No expenses found
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-4 bg-white dark:bg-[#0A0A0A]">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {expense.description || 'No Description'}
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">{formatDate(expense.dateIncurred)}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(expense.amountCents, businessCurrency)}
                  </div>
                  <div className="mt-1">
                    <Badge variant="secondary" className="font-normal text-[10px]">{expense.category}</Badge>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-zinc-100 dark:border-zinc-800 pt-3">
                <div className="text-zinc-500 truncate max-w-[200px]">
                  {expense.project?.title || 'General Expense'}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger 
                    render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={isDeleting === expense.id} />}
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(expense.id)}>
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-[#0A0A0A]">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Project</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                  No expenses found
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.dateIncurred)}</TableCell>
                  <TableCell className="font-medium">
                    {expense.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal text-xs">{expense.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {expense.project?.title || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(expense.amountCents, businessCurrency)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" className="h-8 w-8 p-0" disabled={isDeleting === expense.id} />}
                      >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingExpense(expense)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600 focus:text-red-600" 
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ExpenseDialog 
        open={isCreating || !!editingExpense} 
        onOpenChange={(open) => {
          if (!open) {
            setEditingExpense(null)
            setIsCreating(false)
            if (searchParams.get('newExpense') === '1') {
              const params = new URLSearchParams(searchParams.toString())
              params.delete('newExpense')
              router.replace(`${pathname}?${params.toString()}`, { scroll: false })
            }
          }
        }}
        expense={editingExpense}
        projects={projects}
        businessCurrency={businessCurrency}
      />
    </>
  )
}
