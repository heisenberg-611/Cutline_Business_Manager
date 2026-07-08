'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'

export async function globalSearch(query: string) {
  const { orgId } = await auth()
  if (!orgId) return []

  const q = query.trim()
  if (!q) return []

  // Run searches in parallel
  const [projects, clients, invoices, assets] = await Promise.all([
    prisma.project.findMany({
      where: {
        businessId: orgId,
        title: { contains: q, mode: 'insensitive' }
      },
      take: 5,
    }),
    prisma.client.findMany({
      where: {
        businessId: orgId,
        displayName: { contains: q, mode: 'insensitive' }
      },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: {
        businessId: orgId,
        invoiceNumber: { contains: q, mode: 'insensitive' }
      },
      take: 5,
    }),
    prisma.asset.findMany({
      where: {
        businessId: orgId,
        name: { contains: q, mode: 'insensitive' }
      },
      take: 5,
    })
  ])

  const results = [
    ...projects.map(p => ({
      id: p.id,
      title: p.title,
      type: 'Project',
      href: `/dashboard/projects/${p.id}`
    })),
    ...clients.map(c => ({
      id: c.id,
      title: c.displayName,
      type: 'Client',
      href: `/dashboard/clients`
    })),
    ...invoices.map(i => ({
      id: i.id,
      title: i.invoiceNumber,
      type: 'Invoice',
      href: `/dashboard/financials/${i.id}`
    })),
    ...assets.map(a => ({
      id: a.id,
      title: a.name,
      type: 'Asset',
      href: `/dashboard/assets` // Since assets don't have individual pages yet
    }))
  ]

  return results
}
