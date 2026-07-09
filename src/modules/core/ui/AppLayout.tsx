'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const GlobalSearch = dynamic(
  () => import('./GlobalSearch').then(mod => mod.GlobalSearch), 
  { ssr: false }
)
import { ThemeToggle } from '@/components/theme-toggle'

import { 
  Briefcase, 
  Users, 
  FolderKanban, 
  Kanban,
  Wallet, 
  Settings, 
  Search,
  Command as CmdIcon,
  Box,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pin,
  PinOff,
  BarChart3
} from 'lucide-react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    const saved = localStorage.getItem('cutline_sidebar_pinned')
    if (saved) setIsPinned(JSON.parse(saved))
  }, [])

  const togglePin = () => {
    const next = !isPinned
    setIsPinned(next)
    localStorage.setItem('cutline_sidebar_pinned', JSON.stringify(next))
  }

  const isExpanded = isPinned || isHovered
  const isCollapsed = !isExpanded

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsCommandOpen((open) => !open)
      }
      if (e.key === '+' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsQuickActionsOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const navItems = [
    { label: 'Dashboard', icon: Briefcase, href: '/dashboard' },
    { label: 'Pipeline', icon: Kanban, href: '/dashboard/pipeline' },
    { label: 'Projects', icon: FolderKanban, href: '/dashboard/projects' },
    { label: 'Clients', icon: Users, href: '/dashboard/clients' },
    { label: 'Financials', icon: Wallet, href: '/dashboard/financials' },
    { label: 'Reports', icon: BarChart3, href: '/dashboard/reports' },
    { label: 'Assets', icon: Box, href: '/dashboard/assets' },
  ]

  // Contextual Topbar Logic
  const getContextualTitle = () => {
    return 'Cutline OS'
  }

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`border-r border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-[#0A0A0A] flex flex-col transition-all duration-300 ease-in-out-smooth z-20 ${isExpanded ? 'w-64' : 'w-16'}`}
      >
        {/* Business Switcher Top Header */}
        <div className="h-14 flex items-center px-4 border-b border-zinc-200 dark:border-white/10 overflow-hidden">
          <div className={`transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-full'}`}>
            <OrganizationSwitcher 
              hidePersonal
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "focus:shadow-none focus:outline-none w-full justify-start",
                  organizationPreviewMainIdentifier: "font-semibold text-sm",
                }
              }}
            />
          </div>
          {isCollapsed && (
            <div className="w-full flex justify-center text-zinc-900 dark:text-white font-bold">
              C
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <motion.div 
                key={item.href}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                <Link 
                  href={item.href}
                  className={`group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                    ? 'bg-zinc-200/70 text-zinc-900 dark:bg-white/10 dark:text-white' 
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <motion.div
                    variants={{
                      initial: { scale: 1, rotate: 0 },
                      hover: { scale: 1.15, rotate: 10 },
                      tap: { scale: 0.95 }
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? '' : 'group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`} />
                  </motion.div>
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-zinc-200 dark:border-white/10 space-y-1">
          <button 
            onClick={() => setIsCommandOpen(true)}
            className={`w-full flex items-center px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}
            title={isCollapsed ? 'Search (Cmd+K)' : undefined}
          >
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Search...</span>}
            </div>
            {!isCollapsed && (
              <span className="flex items-center text-xs opacity-50 bg-zinc-200 dark:bg-white/10 px-1.5 py-0.5 rounded">
                <CmdIcon className="h-3 w-3 mr-0.5" /> K
              </span>
            )}
          </button>
          
          <Link 
            href="/dashboard/settings"
            className={`group flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5 transition-colors ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Settings</span>}
          </Link>

          <ThemeToggle isCollapsed={isCollapsed} />

          <button 
            onClick={togglePin}
            className={`w-full flex items-center py-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors ${isExpanded ? 'justify-between px-3' : 'justify-center'}`}
            title={isExpanded ? (isPinned ? 'Unpin Sidebar' : 'Pin Sidebar') : undefined}
          >
            {isExpanded && <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{isPinned ? 'Unpin' : 'Pin'}</span>}
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Contextual Top bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{getContextualTitle()}</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsQuickActionsOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
            <UserButton />
          </div>
        </header>
        
        {/* Page Content Scrollable Area */}
        <div className="flex-1 overflow-auto p-6 md:p-10 relative">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>

        {/* QUICK ACTIONS SLIDE-OUT PANEL */}
        {isQuickActionsOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsQuickActionsOpen(false)}
            />
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-white/10 shadow-2xl animate-in slide-in-from-right duration-200 ease-out-smooth">
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quick Actions</h2>
                  <button onClick={() => setIsQuickActionsOpen(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs">esc to close</button>
                </div>
                <div className="space-y-2">
                  <Link href="/dashboard/projects/new" onClick={() => setIsQuickActionsOpen(false)} className="block p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/20 transition-colors">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">New Project</div>
                    <div className="text-xs text-zinc-500 mt-1">Start a new video editing project</div>
                  </Link>
                  <Link href="/dashboard/financials/new" onClick={() => setIsQuickActionsOpen(false)} className="block p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/20 transition-colors">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">Create Invoice</div>
                    <div className="text-xs text-zinc-500 mt-1">Bill a client for completed work</div>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* COMMAND PALETTE MODAL */}
      <GlobalSearch open={isCommandOpen} onOpenChange={setIsCommandOpen} />
    </div>
  )
}
