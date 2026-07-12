'use client'

import React, { useState, useTransition, useCallback, useEffect } from 'react'
import { createAsset, updateAsset, checkAssetDuplicate } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'
import { AlertTriangle } from 'lucide-react'

type Asset = {
  id?: string
  type: string
  name: string
  vendor: string | null
  licenseType: string | null
  expiresAt: Date | null
  cost: number
}

const ASSET_TYPES = ['Music', 'Font', 'LUT', 'Plugin', 'Stock Footage', 'SFX', 'Motion Graphics']

export function AssetForm({ asset, onSuccess, currency = 'USD' }: { asset?: Asset, onSuccess?: () => void, currency?: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [checkingDuplicate, setCheckingDuplicate] = useState(false)
  
  const [formData, setFormData] = useState({
    type: asset?.type || 'Music',
    name: asset?.name || '',
    vendor: asset?.vendor || '',
    licenseType: asset?.licenseType || '',
    expiresAt: asset?.expiresAt ? format(new Date(asset.expiresAt), 'yyyy-MM-dd') : '',
    costDollar: asset?.cost ? (asset.cost / 100).toString() : '0'
  })

  const getCurrencySymbol = (currencyCode: string) => {
    try {
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        currencyDisplay: 'narrowSymbol'
      });
      return formatter.formatToParts(0).find(part => part.type === 'currency')?.value || currencyCode;
    } catch {
      return currencyCode;
    }
  };

  const currencySymbol = getCurrencySymbol(currency);

  const checkForDuplicate = useCallback(async (name: string, type: string) => {
    setDuplicateWarning(null)
    if (!name.trim() || !type) return

    setCheckingDuplicate(true)
    try {
      const result = await checkAssetDuplicate(name, type, asset?.id)
      if (result.exists) {
        setDuplicateWarning(`An asset named "${result.assetName}" of type "${type}" already exists.`)
      }
    } catch {
      // Silently fail
    } finally {
      setCheckingDuplicate(false)
    }
  }, [asset?.id])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const dataToSubmit = {
        type: formData.type,
        name: formData.name,
        vendor: formData.vendor || null,
        licenseType: formData.licenseType || null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
        cost: Math.round(parseFloat(formData.costDollar || '0') * 100)
      }

      try {
        if (asset?.id) {
          await updateAsset(asset.id, dataToSubmit)
        } else {
          await createAsset(dataToSubmit)
        }
        if (onSuccess) onSuccess()
      } catch (err: any) {
        setError(err?.message || "Failed to save asset")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Asset Type</Label>
          <Select 
            value={formData.type} 
            onValueChange={val => {
              const newType = val || 'Music'
              setFormData({ ...formData, type: newType })
              setDuplicateWarning(null)
              setError(null)
              if (formData.name.trim()) {
                checkForDuplicate(formData.name, newType)
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent >
              {ASSET_TYPES.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Asset Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={e => { setFormData({ ...formData, name: e.target.value }); setDuplicateWarning(null); setError(null) }}
            onBlur={() => checkForDuplicate(formData.name, formData.type)}
            required
            className={duplicateWarning ? 'border-amber-400 focus-visible:ring-amber-400' : ''}
          />
        </div>
      </div>

      {(duplicateWarning || checkingDuplicate) && (
        <div>
          {checkingDuplicate && (
            <p className="text-xs text-zinc-400">Checking for duplicates...</p>
          )}
          {duplicateWarning && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>{duplicateWarning}</span>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="vendor">Vendor / Creator</Label>
          <Input
            id="vendor"
            value={formData.vendor}
            onChange={e => setFormData({ ...formData, vendor: e.target.value })}
            placeholder="e.g. Artlist, Envato"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="licenseType">License Type</Label>
          <Input
            id="licenseType"
            value={formData.licenseType}
            onChange={e => setFormData({ ...formData, licenseType: e.target.value })}
            placeholder="e.g. Standard, Commercial"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiresAt">Expiry Date</Label>
          <Input
            id="expiresAt"
            type="date"
            value={formData.expiresAt}
            onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Cost ({currencySymbol})</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.costDollar}
            onChange={e => setFormData({ ...formData, costDollar: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending || !!duplicateWarning}>
          {isPending ? 'Saving...' : asset ? 'Save Changes' : 'Add Asset'}
        </Button>
      </div>
    </form>
  )
}
