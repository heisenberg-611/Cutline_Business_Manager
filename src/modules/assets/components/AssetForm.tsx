'use client'

import React, { useState, useTransition } from 'react'
import { createAsset, updateAsset } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { format } from 'date-fns'

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

export function AssetForm({ asset, onSuccess }: { asset?: Asset, onSuccess?: () => void }) {
  const [isPending, startTransition] = useTransition()
  
  const [formData, setFormData] = useState({
    type: asset?.type || 'Music',
    name: asset?.name || '',
    vendor: asset?.vendor || '',
    licenseType: asset?.licenseType || '',
    expiresAt: asset?.expiresAt ? format(new Date(asset.expiresAt), 'yyyy-MM-dd') : '',
    costDollar: asset?.cost ? (asset.cost / 100).toString() : '0'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
      } catch (err) {
        alert("Failed to save asset")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Asset Type</Label>
          <Select 
            value={formData.type} 
            onValueChange={val => setFormData({ ...formData, type: val || 'Music' })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
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
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
      </div>
      
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
          <Label htmlFor="cost">Cost ($)</Label>
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
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : asset ? 'Save Changes' : 'Add Asset'}
        </Button>
      </div>
    </form>
  )
}
