'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'
import { 
  Briefcase, 
  Users, 
  FolderKanban, 
  Wallet, 
  Settings, 
  Search,
  Command as CmdIcon
} from 'lucide-react'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCommandOpen, setIsCommandOpen] = useState(false)

  // Typical keyboard shortcut for Command Palette (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsCommandOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const navItems = [
    { label: 'Dashboard', icon: Briefcase, href: '/dashboard' },
    { label: 'Clients', icon: Users, href: '/dashboard/clients' },
    { label: 'Projects', icon: FolderKanban, href: '/dashboard/projects' },
    { label: 'Financials', icon: Wallet, href: '/dashboard/financials' },
  ]

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      
      {/* LEFT SIDEBAR (Linear / Stripe calm aesthetic) */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex flex-col transition-all">
        
        {/* Business Switcher Top Header */}
        <div className="h-16 flex items-center px-4 border-b border-zinc-200 dark:border-zinc-800">
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

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          <button 
            onClick={() => setIsCommandOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search...
            </span>
            <span className="flex items-center text-xs opacity-50">
              <CmdIcon className="h-3 w-3 mr-0.5" /> K
            </span>
          </button>
          
          <Link 
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (for breadcrumbs or secondary actions, user profile) */}
        <header className="h-16 flex items-center justify-end px-6 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <UserButton afterSignOutUrl="/"/>
        </header>
        
        {/* Page Content Scrollable Area */}
        <div className="flex-1 overflow-auto p-6 md:p-10">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </div>
      </main>

      {/* COMMAND PALETTE MODAL (Implementation Placeholder) */}
      {isCommandOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden p-4">
            <div className="text-sm text-zinc-500 mb-2">Command Palette (Placeholder)</div>
            <input 
              autoFocus 
              type="text" 
              placeholder="Type a command or search..." 
              className="w-full bg-transparent border-none focus:outline-none text-lg p-2 text-zinc-900 dark:text-zinc-100"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsCommandOpen(false)
              }}
            />
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button 
                onClick={() => setIsCommandOpen(false)}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                esc to close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
