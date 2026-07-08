'use client'

import React, { useState, useTransition } from 'react'
import { linkAssetToProject, unlinkAssetFromProject } from '@/modules/assets/actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash } from 'lucide-react'

type ProjectAsset = {
  assetId: string
  asset: {
    id: string
    type: string
    name: string
    vendor: string | null
  }
}

type AvailableAsset = {
  id: string
  name: string
  type: string
}

export function AssetPanel({ projectId, currentAssets, availableAssets }: { projectId: string, currentAssets: ProjectAsset[], availableAssets: AvailableAsset[] }) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  const handleLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssetId) return

    startTransition(async () => {
      try {
        await linkAssetToProject(projectId, selectedAssetId)
        setIsOpen(false)
        setSelectedAssetId('')
      } catch (err) {
        alert("Failed to link asset")
      }
    })
  }

  const handleUnlink = (assetId: string) => {
    if (confirm('Unlink this asset from the project?')) {
      startTransition(async () => {
        try {
          await unlinkAssetFromProject(projectId, assetId)
        } catch (err) {
          alert("Failed to unlink asset")
        }
      })
    }
  }

  const unlinkedAssets = availableAssets.filter(aa => !currentAssets.some(ca => ca.assetId === aa.id))

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex justify-between items-center">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Project Assets</h3>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 border border-zinc-200 bg-white hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 h-8 rounded-md px-3">
            Link Asset
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Link Existing Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLink} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Select value={selectedAssetId} onValueChange={val => setSelectedAssetId(val || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an asset from library" />
                  </SelectTrigger>
                  <SelectContent>
                    {unlinkedAssets.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.name} ({asset.type})
                      </SelectItem>
                    ))}
                    {unlinkedAssets.length === 0 && (
                      <SelectItem value="none" disabled>No available assets to link</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isPending || !selectedAssetId || selectedAssetId === 'none'}>
                  {isPending ? 'Linking...' : 'Link Asset'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {currentAssets.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-8">No assets linked to this project.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {currentAssets.map(({ asset }) => (
              <li key={asset.id} className="py-3 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{asset.name}</span>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider px-1.5 py-0">
                      {asset.type}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {asset.vendor || 'Unknown Vendor'}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={() => handleUnlink(asset.id)}
                  disabled={isPending}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
