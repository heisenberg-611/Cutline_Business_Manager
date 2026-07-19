'use client'

import React, { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { globalSearch } from '@/modules/core/actions'
import { FileText, Folder, Loader2, Package2, ReceiptText, User, Terminal, Compass, Clock, Check } from 'lucide-react'

type SearchResult = {
  id: string
  title: string
  type: string
  subtitle: string
  href: string
}

const SEARCH_GROUPS = [
  { type: 'Recent', label: 'Recent Searches' },
  { type: 'Command', label: 'Quick Actions' },
  { type: 'Navigation', label: 'Jump Links' },
  { type: 'Project', label: 'Projects' },
  { type: 'Client', label: 'Clients' },
  { type: 'Invoice', label: 'Invoices' },
  { type: 'Expense', label: 'Expenses' },
  { type: 'Asset', label: 'Assets' },
] as const

export function GlobalSearch({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<SearchResult[]>([])
  const [error, setError] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const requestId = useRef(0)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cutline_recent_searches')
      if (saved) {
        setRecentSearches(JSON.parse(saved).map((item: any) => ({ ...item, type: 'Recent', originalType: item.type })))
      }
    } catch {}
  }, [])

  const addToRecents = (item: SearchResult) => {
    const originalItem = item.type === 'Recent' ? { ...item, type: (item as any).originalType } : item
    if (originalItem.type === 'Command' || originalItem.type === 'Navigation') return
    
    setRecentSearches(prev => {
      const filtered = prev.filter(p => p.id !== originalItem.id)
      const next = [{ ...originalItem, type: 'Recent', originalType: originalItem.type }, ...filtered].slice(0, 5)
      localStorage.setItem('cutline_recent_searches', JSON.stringify(next.map(n => ({...n, type: n.originalType}))))
      return next
    })
  }

  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setError(false)
      setCopiedId(null)
      return
    }

    const normalizedQuery = query.trim()
    
    if (normalizedQuery.startsWith('/') || normalizedQuery.startsWith('>')) {
      const q = normalizedQuery.slice(1).toLowerCase()
      const commands = [
        { id: 'cmd-new-project', type: 'Command', title: 'Create New Project', subtitle: 'Quick Action', href: '/dashboard/projects?new=true' },
        { id: 'cmd-new-client', type: 'Command', title: 'Add New Client', subtitle: 'Quick Action', href: '/dashboard/clients?new=true' },
        { id: 'cmd-new-invoice', type: 'Command', title: 'Create New Invoice', subtitle: 'Quick Action', href: '/dashboard/financials?new=invoice' },
        { id: 'cmd-new-expense', type: 'Command', title: 'Log New Expense', subtitle: 'Quick Action', href: '/dashboard/financials?new=expense' }
      ]
      setResults(commands.filter(c => c.title.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q)))
      setError(false)
      return
    }

    let filterType: string | undefined = undefined
    let dbQuery = normalizedQuery

    if (normalizedQuery.startsWith('@')) {
      filterType = 'client'
      dbQuery = normalizedQuery.slice(1).trim()
    } else if (normalizedQuery.startsWith('#')) {
      filterType = 'project'
      dbQuery = normalizedQuery.slice(1).trim()
    } else if (normalizedQuery.startsWith('$')) {
      filterType = 'finance'
      dbQuery = normalizedQuery.slice(1).trim()
    }

    if (dbQuery.length < 2) {
      setResults([])
      setError(false)
      return
    }

    const currentRequestId = ++requestId.current
    setError(false)

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await globalSearch(dbQuery, filterType)
          
          let finalRes = res
          if (!filterType && dbQuery.length >= 2) {
             const staticLinks = [
               { id: 'nav-settings', type: 'Navigation', title: 'Business Settings', subtitle: 'Preferences, Team, Subscription', href: '/dashboard/settings' },
               { id: 'nav-analytics', type: 'Navigation', title: 'Analytics Dashboard', subtitle: 'Reports and Metrics', href: '/dashboard/analytics' },
               { id: 'nav-archive', type: 'Navigation', title: 'Archive', subtitle: 'Deleted items', href: '/dashboard/archive' }
             ]
             const matchedStatic = staticLinks.filter(l => l.title.toLowerCase().includes(dbQuery.toLowerCase()) || l.subtitle.toLowerCase().includes(dbQuery.toLowerCase()))
             finalRes = [...matchedStatic, ...res]
          }
          
          if (currentRequestId === requestId.current) setResults(finalRes)
        } catch {
          if (currentRequestId === requestId.current) {
            setResults([])
            setError(true)
          }
        }
      })
    }, 250)

    return () => clearTimeout(timer)
  }, [open, query])

  const handleSelect = (item: SearchResult) => {
    addToRecents(item)
    onOpenChange(false)
    router.push(item.href)
  }

  const getIcon = (type: string, originalType?: string) => {
    const t = type === 'Recent' ? originalType : type
    switch (t) {
      case 'Project': return <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case 'Client': return <User className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      case 'Invoice': return <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      case 'Expense': return <ReceiptText className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'Asset': return <Package2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      case 'Command': return <Terminal className="h-4 w-4 text-zinc-500" />
      case 'Navigation': return <Compass className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      default: return <Clock className="h-4 w-4 text-zinc-400" />
    }
  }

  const activeResults = query.trim().length === 0 && recentSearches.length > 0 ? recentSearches : results

  const groupedResults = SEARCH_GROUPS.map(group => ({
    ...group,
    items: activeResults.filter(result => result.type === group.type)
  })).filter(group => group.items.length > 0)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      const selectedEl = document.querySelector('[cmdk-item][data-selected="true"]')
      if (selectedEl) {
        const href = selectedEl.getAttribute('data-href')
        const id = selectedEl.getAttribute('data-id')
        if (href) {
           e.preventDefault()
           navigator.clipboard.writeText(window.location.origin + href)
           if (id) {
             setCopiedId(id)
             setTimeout(() => setCopiedId(null), 2000)
           }
        }
      }
    }
  }

  const emptyMessage = error
    ? 'Search is temporarily unavailable.'
    : isPending
      ? 'Searching…'
      : query.trim().length === 0
        ? 'Search projects, clients (@), invoices ($), or type / for actions.'
        : query.trim().length < 2 && !query.startsWith('/') && !query.startsWith('>')
          ? 'Type at least 2 characters to search.'
          : 'No matching records found.'

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command shouldFilter={false} onKeyDown={handleKeyDown} className="rounded-lg border shadow-md">
        <CommandInput 
          placeholder="Search... (use @ for clients, # for projects, / for actions)"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            <span className="inline-flex items-center gap-2">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {emptyMessage}
            </span>
          </CommandEmpty>
        
          {groupedResults.map(({ type, label, items }) => (
          <CommandGroup key={type} heading={`${label} (${items.length})`}>
            {items.map(item => (
              <CommandItem
                key={`${item.type}-${item.id}`}
                value={`${item.type}-${item.id}`}
                onSelect={() => handleSelect(item)}
                data-href={item.href}
                data-id={item.id}
              >
                {getIcon(item.type, (item as any).originalType)}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{item.title}</div>
                  {item.subtitle && <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>}
                </div>
                {copiedId === item.id ? (
                  <CommandShortcut className="flex items-center gap-1 text-emerald-500 font-medium tracking-normal"><Check className="h-3 w-3" /> Copied</CommandShortcut>
                ) : (
                  <CommandShortcut>↵</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
          ))}
        </CommandList>
        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>↑↓ to navigate</span>
          <span>↵ to open · Esc to close</span>
        </div>
      </Command>
    </CommandDialog>
  )
}
