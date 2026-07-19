'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { format } from 'date-fns'

export function ExportProjectsButton({ projects }: { projects: any[] }) {
  const handleExport = () => {
    if (!projects.length) return

    const headers = [
      'Project ID',
      'Business ID',
      'Client ID',
      'Client Name',
      'Project Title',
      'Type',
      'Priority',
      'Current Stage ID',
      'Current Stage Name',
      'Order Index',
      'Is Archived',
      'Deadline',
      'Created At',
      'Updated At',
      'Links',
      'Assets'
    ]
    
    const rows = projects.map(p => {
      const linksStr = p.links ? p.links.map((l: any) => `${l.label}: ${l.url}`).join(' | ') : ''
      const assetsStr = p.assets ? p.assets.map((pa: any) => `${pa.asset.name}: ${pa.asset.url}`).join(' | ') : ''
      
      return [
        `"${p.displayId || p.id || ''}"`,
        `"${p.businessId || ''}"`,
        `"${p.client?.displayId || p.clientId || ''}"`,
        `"${(p.client?.displayName || '').replace(/"/g, '""')}"`,
        `"${(p.title || '').replace(/"/g, '""')}"`,
        `"${(p.type || '').replace(/"/g, '""')}"`,
        `"${(p.priority || '').replace(/"/g, '""')}"`,
        `"${p.statusStageId || ''}"`,
        `"${(p.statusStage?.name || 'Unassigned').replace(/"/g, '""')}"`,
        `"${p.orderIndex || 0}"`,
        `"${p.isArchived ? 'true' : 'false'}"`,
        p.deadline ? format(new Date(p.deadline), 'yyyy-MM-dd') : '',
        p.createdAt ? format(new Date(p.createdAt), 'yyyy-MM-dd') : '',
        p.updatedAt ? format(new Date(p.updatedAt), 'yyyy-MM-dd') : '',
        `"${linksStr.replace(/"/g, '""')}"`,
        `"${assetsStr.replace(/"/g, '""')}"`
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `projects-export-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto shrink-0 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
      <Download className="w-4 h-4 mr-2" />
      Export
    </Button>
  )
}
