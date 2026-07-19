'use server'

import { auth } from '@clerk/nextjs/server'
import prisma from '@/modules/core/db/prisma'

export async function globalSearch(query: string, filterType?: string) {
  const { orgId } = await auth()
  if (!orgId) return []

  const q = query.trim().slice(0, 80)
  if (q.length < 2) return []

  const [projects, clients, invoices, assets, expenses] = await Promise.all([
    (!filterType || filterType === 'project') ? prisma.project.findMany({
      where: {
        businessId: orgId,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { displayId: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 5,
      select: {
        id: true,
        title: true,
        displayId: true,
        client: { select: { displayName: true } }
      }
    }) : Promise.resolve([]),
    
    (!filterType || filterType === 'client') ? prisma.client.findMany({
      where: {
        businessId: orgId,
        OR: [
          { displayName: { contains: q, mode: 'insensitive' } },
          { companyName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 5,
      select: { id: true, displayName: true, companyName: true, email: true }
    }) : Promise.resolve([]),
    
    (!filterType || filterType === 'finance') ? prisma.invoice.findMany({
      where: {
        businessId: orgId,
        OR: [
          { invoiceNumber: { contains: q, mode: 'insensitive' } },
          { client: { displayName: { contains: q, mode: 'insensitive' } } }
        ]
      },
      take: 5,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        client: { select: { displayName: true } }
      }
    }) : Promise.resolve([]),
    
    (!filterType || filterType === 'asset') ? prisma.asset.findMany({
      where: {
        businessId: orgId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { vendor: { contains: q, mode: 'insensitive' } },
          { licenseType: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: 5,
      select: { id: true, name: true, type: true, vendor: true }
    }) : Promise.resolve([]),
    
    (!filterType || filterType === 'finance') ? prisma.expense.findMany({
      where: {
        businessId: orgId,
        OR: [
          { description: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { project: { title: { contains: q, mode: 'insensitive' } } }
        ]
      },
      take: 5,
      select: {
        id: true,
        description: true,
        category: true,
        project: { select: { title: true } }
      }
    }) : Promise.resolve([])
  ])

  const results = [
    ...projects.map(p => ({
      id: p.id,
      title: p.title,
      type: 'Project',
      subtitle: [p.displayId, p.client.displayName].filter(Boolean).join(' · '),
      href: `/dashboard/projects/${p.id}`
    })),
    ...clients.map(c => ({
      id: c.id,
      title: c.displayName,
      type: 'Client',
      subtitle: c.companyName || c.email || 'Client directory',
      href: `/dashboard/clients`
    })),
    ...invoices.map(i => ({
      id: i.id,
      title: i.invoiceNumber,
      type: 'Invoice',
      subtitle: `${i.client.displayName} · ${i.status.replaceAll('_', ' ')}`,
      href: `/dashboard/financials/${i.id}`
    })),
    ...assets.map(a => ({
      id: a.id,
      title: a.name,
      type: 'Asset',
      subtitle: [a.type, a.vendor].filter(Boolean).join(' · '),
      href: `/dashboard/assets` // Since assets don't have individual pages yet
    })),
    ...expenses.map(e => ({
      id: e.id,
      title: e.description || e.category,
      type: 'Expense',
      subtitle: [e.category, e.project?.title].filter(Boolean).join(' · '),
      href: '/dashboard/financials?tab=expenses'
    }))
  ]

  return results
}
