'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { LayoutGrid, List, TableProperties } from 'lucide-react'

export function PipelineViewToggle() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view = searchParams.get('view') || 'board'

  const setView = (newView: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', newView)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button 
        onClick={() => setView('board')}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'board' ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-800' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent'}`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Board
      </button>
      <button 
        onClick={() => setView('timeline')}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'timeline' ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-800' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent'}`}
      >
        <List className="w-3.5 h-3.5" />
        Timeline
      </button>
      <button 
        onClick={() => setView('table')}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === 'table' ? 'bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-200 dark:border-zinc-800' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent'}`}
      >
        <TableProperties className="w-3.5 h-3.5" />
        Table
      </button>
    </div>
  )
}
