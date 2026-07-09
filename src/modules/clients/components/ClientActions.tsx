'use client'

import React, { useState, useTransition } from 'react'
import { MoreHorizontal, Edit, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateClient, deleteClient, updateClientRating } from '../actions'
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
  
  const [formData, setFormData] = useState({
    ...client,
    email: client.email || '',
    phone: client.phone || ''
  })
  const [rating, setRating] = useState(client.internalRating || 3)

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      try {
        await updateClient(client.id, formData)
        // Update rating if changed
        if (rating !== (client.internalRating || 3)) {
          await updateClientRating(client.id, rating)
        }
        setIsEditOpen(false)
      } catch (err) {
        alert("Failed to update client")
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

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
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
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
