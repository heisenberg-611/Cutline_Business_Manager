'use client'

import React, { useState, useTransition, useCallback } from 'react'
import { MoreHorizontal, Edit, Trash, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateClient, deleteClient, updateClientRating, checkClientEmailExists } from '../actions'
import { Star } from 'lucide-react'

type Client = {
  id: string
  displayName: string
  companyName: string
  email?: string | null
  phone?: string | null
  industry: string
  preferredChannel: string
  internalRating?: number | null
}

export function ClientActions({ client }: { client: Client }) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [emailWarning, setEmailWarning] = useState<string | null>(null)
  const [checkingEmail, setCheckingEmail] = useState(false)
  
  const [formData, setFormData] = useState({
    ...client,
    email: client.email || '',
    phone: client.phone || ''
  })
  const [rating, setRating] = useState(client.internalRating || 3)

  const handleEmailBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value.trim()
    setEmailWarning(null)
    if (!email || email === client.email) return // Skip if unchanged

    setCheckingEmail(true)
    try {
      const result = await checkClientEmailExists(email, client.id)
      if (result.exists) {
        setEmailWarning(`A client with this email already exists: "${result.clientName}"`)
      }
    } catch {
      // Silently fail
    } finally {
      setCheckingEmail(false)
    }
  }, [client.email, client.id])

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        await updateClient(client.id, formData)
        // Update rating if changed
        if (rating !== (client.internalRating || 3)) {
          await updateClientRating(client.id, rating)
        }
        setIsEditOpen(false)
        setEmailWarning(null)
      } catch (err: any) {
        setError(err?.message || "Failed to update client")
      }
    })
  }

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${client.displayName}? This will delete all associated projects and data.`)) {
      startTransition(async () => {
        try {
          await deleteClient(client.id)
        } catch (err) {
          alert("Failed to delete client")
        }
      })
    }
  }

  function handleEditOpenChange(isOpen: boolean) {
    setIsEditOpen(isOpen)
    if (!isOpen) {
      setError(null)
      setEmailWarning(null)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:bg-red-50 dark:focus:bg-red-950">
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName || ''}
                onChange={e => setFormData({ ...formData, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Required for Invoicing"
                value={formData.email || ''}
                onChange={e => { setFormData({ ...formData, email: e.target.value }); setEmailWarning(null); setError(null) }}
                onBlur={handleEmailBlur}
                className={emailWarning ? 'border-amber-400 focus-visible:ring-amber-400' : ''}
              />
              {checkingEmail && (
                <p className="text-xs text-zinc-400">Checking...</p>
              )}
              {emailWarning && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                  <span>{emailWarning}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/[^0-9+\-()\s]/g, '') })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={e => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredChannel">Preferred Channel</Label>
                <Input
                  id="preferredChannel"
                  value={formData.preferredChannel}
                  onChange={e => setFormData({ ...formData, preferredChannel: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label>Internal Rating</Label>
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i + 1)}
                    className="transition-colors"
                  >
                    <Star
                      className={`w-6 h-6 cursor-pointer ${
                        i < rating
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-zinc-300 dark:text-zinc-600 hover:text-amber-400'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500">{rating} out of 5 stars</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isPending || !!emailWarning}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
