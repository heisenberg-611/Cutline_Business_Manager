'use client'

import React, { useState } from 'react'
import { useOrganization } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Check } from 'lucide-react'
import { syncBusinessName } from '../actions'

export function BusinessNameEditor({ currentName }: { currentName: string }) {
  const { organization } = useOrganization()
  const [name, setName] = useState(currentName)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (!organization || name.trim() === currentName || name.trim() === '') return
    setIsSaving(true)
    try {
      await organization.update({ name: name.trim() })
      await syncBusinessName(name.trim()) // Immediately force DB sync to fix PDF/email lag locally
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to update organization name:', error)
      alert('Failed to update studio name. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 max-w-sm">
      <Input 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        placeholder="Studio Name"
        className="flex-1"
      />
      <Button 
        onClick={handleSave} 
        disabled={isSaving || name.trim() === currentName || name.trim() === ''}
        className="bg-zinc-900 text-white dark:bg-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : saved ? (
          <Check className="w-4 h-4" />
        ) : (
          'Save'
        )}
      </Button>
    </div>
  )
}
