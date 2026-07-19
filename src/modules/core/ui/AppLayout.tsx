'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { OrganizationSwitcher, UserButton, useAuth, useOrganization } from '@clerk/nextjs'
import { AnimatePresence, motion } from 'framer-motion'
import dynamic from 'next/dynamic'

const GlobalSearch = dynamic(
  () => import('./GlobalSearch').then(mod => mod.GlobalSearch),
  { ssr: false }
)
const CurrencyConverter = dynamic(
  () => import('./CurrencyConverter').then(mod => mod.CurrencyConverter),
  { ssr: false }
)
const NotificationCenter = dynamic(
  () => import('@/modules/notifications/components/NotificationCenter').then(m => m.NotificationCenter),
  { ssr: false }
)
import { ThemeToggle } from '@/components/theme-toggle'
import DashboardLoading from '@/app/dashboard/loading'
import { ALL_NAV_ITEMS } from './navigation'
import { ALL_QUICK_ACTIONS, QuickActionPreference } from './quick-actions'

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
  BarChart3,
  Calculator,
  Archive,
  MessageSquare,
  Video,
  Menu,
  X
} from 'lucide-react'

export function AppLayout({ 
  children, 
  initialNavPreferences,
  initialQuickActionPreferences,
  initialNotificationPreferences
}: { 
  children: React.ReactNode
  initialNavPreferences?: { href: string; visible: boolean }[]
  initialQuickActionPreferences?: QuickActionPreference[]
  initialNotificationPreferences?: { tone: string; dnd: boolean }
}) {
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false)
  const [isCurrencyConverterOpen, setIsCurrencyConverterOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const sidebarRef = React.useRef<HTMLElement>(null)
  const [optimisticPathname, setOptimisticPathname] = useState<string | null>(null)
  const pathname = usePathname()
  const { orgRole } = useAuth()
  const isAdmin = orgRole === 'org:admin'
  const { organization } = useOrganization()

  React.useEffect(() => {
    const saved = localStorage.getItem('cutline_sidebar_pinned')
    if (saved) setIsPinned(JSON.parse(saved))
  }, [])

  // Clear navigating state immediately when the route actually changes
  React.useEffect(() => {
    setIsNavigating(false)
    setOptimisticPathname(null)
  }, [pathname])

  const togglePin = () => {
    const next = !isPinned
    setIsPinned(next)
    localStorage.setItem('cutline_sidebar_pinned', JSON.stringify(next))
  }

  React.useEffect(() => {
    if (!sidebarRef.current) return
    const observer = new MutationObserver(() => {
      const trigger = sidebarRef.current?.querySelector('.cl-organizationSwitcherTrigger')
      if (trigger) {
        setIsDropdownOpen(trigger.getAttribute('aria-expanded') === 'true')
      }
    })
    
    observer.observe(sidebarRef.current, {
      attributes: true,
      subtree: true,
      attributeFilter: ['aria-expanded']
    })
    return () => observer.disconnect()
  }, [])

  const isExpanded = isPinned || isHovered || isDropdownOpen
  const isCollapsed = !isExpanded

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsCommandOpen((open) => !open)
      }
      if (e.key?.toLowerCase() === 'q' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setIsQuickActionsOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const navItems = React.useMemo(() => {
    let items = ALL_NAV_ITEMS

    if (orgRole === 'org:admin' && initialNavPreferences && initialNavPreferences.length > 0) {
      const preferenceMap = new Map(initialNavPreferences.map(p => [p.href, p]))
      const sorted = [...ALL_NAV_ITEMS].sort((a, b) => {
        const indexA = initialNavPreferences.findIndex(p => p.href === a.href)
        const indexB = initialNavPreferences.findIndex(p => p.href === b.href)
        if (indexA === -1 && indexB === -1) return 0
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
      items = sorted.filter(item => {
        const pref = preferenceMap.get(item.href)
        return pref ? pref.visible : true
      })
    }

    if (orgRole !== 'org:admin') {
      const restricted = ['/dashboard/financials', '/dashboard/analytics', '/dashboard/settings', '/dashboard/archive', '/dashboard/clients']
      items = items.filter(item => !restricted.some(r => item.href.startsWith(r)))
      
      // Ensure Messages is the last option for members
      const messagesItem = items.find(item => item.href === '/dashboard/messages')
      if (messagesItem) {
        items = items.filter(item => item.href !== '/dashboard/messages')
        items.push(messagesItem)
      }
    }

    return items
  }, [initialNavPreferences, orgRole])

  const quickActions = React.useMemo(() => {
    let items = ALL_QUICK_ACTIONS

    if (orgRole === 'org:admin' && initialQuickActionPreferences && initialQuickActionPreferences.length > 0) {
      const preferenceMap = new Map(initialQuickActionPreferences.map(p => [p.id, p]))
      const sorted = [...ALL_QUICK_ACTIONS].sort((a, b) => {
        const indexA = initialQuickActionPreferences.findIndex(p => p.id === a.id)
        const indexB = initialQuickActionPreferences.findIndex(p => p.id === b.id)
        if (indexA === -1 && indexB === -1) return 0
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
      items = sorted.filter(item => {
        const pref = preferenceMap.get(item.id)
        return pref ? pref.visible : true
      })
    }

    if (orgRole !== 'org:admin') {
      const restricted = ['/dashboard/financials', '/dashboard/analytics', '/dashboard/settings', '/dashboard/archive', '/dashboard/clients']
      items = items.filter(item => !restricted.some(r => item.href.startsWith(r)) && item.id !== 'new-project')
    }

    return items
  }, [initialQuickActionPreferences, orgRole])

  // Contextual Topbar Logic
  const getContextualTitle = () => {
    return 'Cutline OS'
  }

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-50 dark:bg-[#0A0A0A] text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">

      {/* LEFT SIDEBAR */}
      <aside
        ref={sidebarRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden md:flex border-r border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-[#0A0A0A] flex-col transition-all duration-300 ease-in-out-smooth z-20 ${isExpanded ? 'w-64' : 'w-16'}`}
      >
        {/* Business Switcher Top Header */}
        <div className={`h-14 flex items-center border-b border-zinc-200 dark:border-white/10 overflow-hidden shrink-0 transition-all ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}>
          <div className={`transition-all duration-200 flex items-center ${isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-full'}`}>
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "focus:shadow-none focus:outline-none w-full justify-start py-2 px-0",
                  organizationPreviewMainIdentifier: "font-semibold text-base",
                  organizationPreviewAvatarContainer: "!w-8 !h-8 shrink-0",
                  organizationPreviewAvatarBox: "!w-8 !h-8",
                  avatarBox: "!w-8 !h-8",
                  avatarImage: "!w-8 !h-8",
                  organizationPreview: "gap-3 items-center"
                }
              }}
            />
          </div>
          {isCollapsed && (
            <div className="flex justify-center items-center w-[32px] min-w-[32px] h-[32px] text-zinc-900 dark:text-white font-bold">
              {organization?.imageUrl ? (
                <img src={organization.imageUrl} alt={organization.name} className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-md object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-md bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-sm">C</div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const currentPath = optimisticPathname || pathname
            const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href))
            return (
              <motion.div
                key={item.href}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
              >
                <Link
                  href={item.href}
                  onClick={() => {
                    // Only trigger the instant skeleton if navigating to a different route
                    if (pathname !== item.href) {
                      setIsNavigating(true)
                      setOptimisticPathname(item.href)
                    }
                  }}
                  className={`group relative z-0 flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive
                      ? 'text-zinc-900 dark:text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      className="absolute inset-0 bg-zinc-200/70 dark:bg-white/10 rounded-md -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  <motion.div
                    variants={{
                      initial: { scale: 1 },
                      hover: { scale: 1.1 },
                      tap: { scale: 0.95 }
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? '' : 'group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`} />
                  </motion.div>
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        key="nav-label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.div>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-zinc-200 dark:border-white/10 space-y-1">
          <motion.div initial="initial" whileHover="hover" whileTap="tap">
            <button
              onClick={() => setIsCommandOpen(true)}
              className={`group relative z-0 w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5 ${isCollapsed ? 'justify-center' : 'justify-between'}`}
              title={isCollapsed ? 'Search (Cmd+K)' : undefined}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <motion.div
                  variants={{
                    initial: { scale: 1 },
                    hover: { scale: 1.1 },
                    tap: { scale: 0.95 }
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                </motion.div>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span 
                      key="search-text"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      Search...
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span 
                    key="search-badge"
                    initial={{ opacity: 0, scale: 0.8, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8, x: -10 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="flex items-center text-xs opacity-50 bg-zinc-200 dark:bg-white/10 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 font-normal"
                  >
                    <CmdIcon className="h-3 w-3 mr-0.5 shrink-0" /> K
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </motion.div>

          <motion.div initial="initial" whileHover="hover" whileTap="tap">
            <button 
              onClick={() => setIsCurrencyConverterOpen(true)}
              className={`group relative z-0 w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5 ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? 'Currency Converter' : undefined}
            >
              <motion.div
                variants={{
                  initial: { scale: 1 },
                  hover: { scale: 1.1 },
                  tap: { scale: 0.95 }
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Calculator className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
              </motion.div>
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    key="currency-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    Currency Converter
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </motion.div>

          {isAdmin && (
            <motion.div initial="initial" whileHover="hover" whileTap="tap">
              <Link
                href="/dashboard/settings"
                className={`group relative z-0 flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  (optimisticPathname || pathname)?.startsWith('/dashboard/settings')
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? 'Settings' : undefined}
              >
                {(optimisticPathname || pathname)?.startsWith('/dashboard/settings') && (
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 bg-zinc-200/70 dark:bg-white/10 rounded-md -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
                <motion.div
                  variants={{
                    initial: { scale: 1 },
                    hover: { scale: 1.1 },
                    tap: { scale: 0.95 }
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Settings className={`h-4 w-4 shrink-0 transition-colors ${(optimisticPathname || pathname)?.startsWith('/dashboard/settings') ? '' : 'group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`} />
                </motion.div>
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      key="settings-label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="whitespace-nowrap overflow-hidden"
                    >
                      Settings
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </motion.div>
          )}

          <ThemeToggle isCollapsed={isCollapsed} />

          <motion.div initial="initial" whileHover="hover" whileTap="tap">
            <button 
              onClick={togglePin}
              className={`group relative z-0 w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5 ${isExpanded ? '' : 'justify-center'}`}
              title={isExpanded ? (isPinned ? 'Unpin Sidebar' : 'Pin Sidebar') : undefined}
            >
              <motion.div
                variants={{
                  initial: { scale: 1 },
                  hover: { scale: 1.1 },
                  tap: { scale: 0.95 }
                }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {isPinned ? (
                  <PinOff className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                ) : (
                  <Pin className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                )}
              </motion.div>
              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.span
                    key="pin-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {isPinned ? 'Unpin' : 'Pin'}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </motion.div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Contextual Top bar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#0A0A0A] shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                <img src="/icon.svg" alt="Cutline OS Logo" className="w-full h-full object-contain dark:invert" />
              </div>
              <h1 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">{getContextualTitle()}</h1>
            </div>
            <div className="md:hidden">
              <OrganizationSwitcher
                hidePersonal
                appearance={{
                  elements: {
                    organizationSwitcherTrigger: "focus:shadow-none focus:outline-none justify-start px-0 py-0",
                    organizationPreviewMainIdentifier: "font-semibold text-sm",
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="md:hidden">
              <ThemeToggle isCollapsed={true} />
            </div>
            <button
              onClick={() => setIsQuickActionsOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-zinc-900 text-white dark:bg-white dark:text-black shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
            <NotificationCenter initialPrefs={initialNotificationPreferences} />
            <UserButton />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-10 relative pb-24 md:pb-10">
          <div className="mx-auto w-full">
            {isNavigating ? <DashboardLoading /> : children}
          </div>
        </div>

        {/* QUICK ACTIONS SLIDE-OUT PANEL */}
        <AnimatePresence>
          {isQuickActionsOpen && (
            <motion.div
              className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsQuickActionsOpen(false)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isQuickActionsOpen && (
            <motion.aside
              aria-label="Quick Actions"
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950"
              initial={{ x: '100%', opacity: 0.98 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="p-6">
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quick Actions</h2>
                  <button
                    type="button"
                    onClick={() => setIsQuickActionsOpen(false)}
                    className="rounded-md p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close Quick Actions</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {quickActions.length > 0 ? (
                    quickActions.map(action => (
                      <Link 
                        key={action.id}
                        href={action.href} 
                        onClick={() => setIsQuickActionsOpen(false)} 
                        className="block p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-white/20 transition-colors"
                      >
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{action.label}</div>
                        <div className="text-xs text-zinc-500 mt-1">{action.description}</div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-sm text-zinc-500 italic p-4 text-center">No quick actions enabled.</div>
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      <GlobalSearch open={isCommandOpen} onOpenChange={setIsCommandOpen} />
      <CurrencyConverter open={isCurrencyConverterOpen} onOpenChange={setIsCurrencyConverterOpen} />

      {/* MOBILE BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0A0A0A] border-t border-zinc-200 dark:border-white/10 grid grid-cols-5 h-[68px] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
        {navItems.filter(i => ['/dashboard', '/dashboard/projects', '/dashboard/financials', '/dashboard/clients'].includes(i.href)).slice(0, 4).map((item) => {
          const currentPath = optimisticPathname || pathname
          const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (pathname !== item.href) {
                  setIsNavigating(true)
                  setOptimisticPathname(item.href)
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'fill-indigo-50 dark:fill-indigo-900/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${isMobileMenuOpen ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </nav>

      {/* MOBILE MENU DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#0A0A0A] rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] border-t border-zinc-200 dark:border-white/10"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-white/5">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 pl-2">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="grid grid-cols-2 gap-2">
                  {navItems.filter(i => !['/dashboard', '/dashboard/projects', '/dashboard/financials', '/dashboard/clients'].includes(i.href)).map((item) => {
                    const currentPath = optimisticPathname || pathname
                    const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href))
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          setIsMobileMenuOpen(false)
                          if (pathname !== item.href) {
                            setIsNavigating(true)
                            setOptimisticPathname(item.href)
                          }
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          isActive 
                            ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-medium' 
                            : 'bg-zinc-50 dark:bg-zinc-900/50 border-transparent text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>

                <div className="h-[1px] w-full bg-zinc-100 dark:bg-white/5" />
                
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider px-2 mb-3">Tools & Preferences</h3>
                  
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setIsCommandOpen(true)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent bg-zinc-50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <Search className="w-5 h-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                    <span className="text-sm font-medium">Global Search</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setIsCurrencyConverterOpen(true)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent bg-zinc-50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                  >
                    <Calculator className="w-5 h-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                    <span className="text-sm font-medium">Currency Converter</span>
                  </button>

                  {isAdmin && (
                    <Link
                      href="/dashboard/settings"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        if (pathname !== '/dashboard/settings') {
                          setIsNavigating(true)
                          setOptimisticPathname('/dashboard/settings')
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent bg-zinc-50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <Settings className="w-5 h-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
                      <span className="text-sm font-medium">Settings</span>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
