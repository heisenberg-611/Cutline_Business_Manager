import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getAssets, deleteAsset } from '@/modules/assets/actions'
import { AssetForm } from '@/modules/assets/components/AssetForm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import prisma from '@/modules/core/db/prisma'

export default async function AssetsPage() {
  const { orgId } = await auth()
  
  if (!orgId) {
    redirect('/dashboard/select-business')
  }

  const [assets, business] = await Promise.all([
    getAssets(orgId),
    prisma.business.findUnique({ where: { id: orgId } })
  ])

  const currency = business?.defaultCurrency || 'USD'

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency,
      currencyDisplay: 'narrowSymbol'
    }).format(cents / 100)
  }

  const isExpiringSoon = (date: Date | null) => {
    if (!date) return false
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(now.getDate() + 30)
    return date <= thirtyDaysFromNow
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h3 className="text-xl font-semibold leading-6 text-zinc-900 dark:text-zinc-100">
            Asset Library
          </h3>
          <p className="mt-2 max-w-4xl text-sm text-zinc-500">
            Track your music licenses, fonts, plugins, and stock footage across all projects.
          </p>
        </div>
        <Dialog>
          <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/90 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90 h-9 px-4 py-2">
            Add Asset
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
            </DialogHeader>
            <AssetForm currency={currency} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {assets.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No assets</h3>
            <p className="mt-1 text-sm text-zinc-500">Get started by adding your first asset.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                <TableHead>Type</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Vendor / License</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Used In</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id} className="border-b border-zinc-100 dark:border-zinc-800/50">
                  <TableCell>
                    <Badge variant="outline" className="bg-zinc-50 text-zinc-600 border-zinc-200">
                      {asset.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                    {asset.name}
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-zinc-400">
                    <div>{asset.vendor || 'Unknown Vendor'}</div>
                    <div className="text-xs text-zinc-400">{asset.licenseType || 'Standard'}</div>
                  </TableCell>
                  <TableCell className="text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(asset.cost)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {asset.projects.length} project(s)
                    </span>
                  </TableCell>
                  <TableCell>
                    {!asset.expiresAt ? (
                      <span className="text-sm text-zinc-500">Perpetual</span>
                    ) : isExpiringSoon(asset.expiresAt) ? (
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        Exp. {format(new Date(asset.expiresAt), 'MMM d, yyyy')}
                      </span>
                    ) : (
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        Exp. {format(new Date(asset.expiresAt), 'MMM d, yyyy')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 h-8 px-3 text-zinc-500">
                          Edit
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                          <DialogHeader>
                            <DialogTitle>Edit Asset</DialogTitle>
                          </DialogHeader>
                          <AssetForm asset={asset} currency={currency} />
                        </DialogContent>
                      </Dialog>

                      <form action={async () => {
                        'use server'
                        await deleteAsset(asset.id)
                      }}>
                        <Button type="submit" variant="ghost" className="h-8 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
