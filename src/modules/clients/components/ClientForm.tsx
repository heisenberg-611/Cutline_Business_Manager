'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient, checkClientEmailExists } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, AlertTriangle } from 'lucide-react'

export function ClientForm({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailWarning, setEmailWarning] = useState<string | null>(null)
  const [checkingEmail, setCheckingEmail] = useState(false)

  useEffect(() => {
    if (defaultOpen) setOpen(true)
  }, [defaultOpen])

  const handleEmailBlur = useCallback(async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value.trim()
    setEmailWarning(null)
    if (!email) return

    setCheckingEmail(true)
    try {
      const result = await checkClientEmailExists(email)
      if (result.exists) {
        setEmailWarning(`A client with this email already exists: "${result.clientName}"`)
      }
    } catch {
      // Silently fail — the server action will catch it on submit
    } finally {
      setCheckingEmail(false)
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    try {
      await createClient(formData)
      setOpen(false)
      setEmailWarning(null)
      setError(null)
    } catch (err: any) {
      const message = err?.message || "Error creating client."
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setError(null)
      setEmailWarning(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger 
        render={
          <Button className="w-full sm:w-auto bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
            <Plus className="w-4 h-4 mr-2" />
            New Client
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle>Add a New Client</DialogTitle>
          <DialogDescription>
            Create a new client profile to track projects, communications, and finances.
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleSubmit} className="space-y-4 pt-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input id="displayName" name="displayName" placeholder="e.g. John Doe or Acme Corp" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" name="companyName" placeholder="Acme Corporation (Optional)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="client@example.com (Required for Invoicing)"
              onBlur={handleEmailBlur}
              onChange={() => { setEmailWarning(null); setError(null) }}
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
              name="phone" 
              type="tel" 
              placeholder="+1 (555) 000-0000" 
              onInput={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/[^0-9+\-()\s]/g, '') }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input id="industry" name="industry" placeholder="e.g. YouTube, Tech, Real Estate" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredChannel">Preferred Channel</Label>
            <Input id="preferredChannel" name="preferredChannel" placeholder="e.g. Slack, Email, WhatsApp" />
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={loading || !!emailWarning}>
              {loading ? "Creating..." : "Create Client"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
