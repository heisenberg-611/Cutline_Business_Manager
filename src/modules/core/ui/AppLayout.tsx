'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { OrganizationSwitcher, UserButton, useAuth, useOrganization } from '@clerk/nextjs'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import DashboardLoading from '@/app/dashboard/loading'
import { ALL_NAV_ITEMS, NAV_SECTIONS } from './navigation'
import { ALL_QUICK_ACTIONS, QuickActionPreference } from './quick-actions'

import {
  Settings,
  Search,
  Command as CmdIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calculator,
  Menu,
  X
} from 'lucide-react'

// Single source of truth for the sidebar collapse/expand motion so the
// container, the icon repositioning, and every label fade stay in lockstep
// instead of drifting apart on separate timings.
const SIDEBAR_TRANSITION = { duration: 0.3, ease: [0.65, 0, 0.35, 1] as const }
const ICON_SPRING = { type: 'spring' as const, stiffness: 300, damping: 20 }
// Rows always render left-aligned (icon at the row's start) — no
// justify-content toggle. That's not a compromise: the icon sits inside two
// stacked padding layers (the row's own px-3, nested inside the nav/action-bar
// wrapper's own px-3/p-3), so at the collapsed width the content box is
// exactly 64 - 12*2 - 12*2 = 16px — precisely the icon's own size. There's no
// slack to center within, so left-aligned already lands dead center; no
// transform needed. (Deliberately not a `layout`/FLIP animation either way —
// FLIP re-measures the DOM as the sibling label's own width tween plays out,
// which fights any in-progress interpolation and snaps at the end.)

// Collapsed (icon-only) rows get a deliberate size bump — h-4 (16px) reads as
// visually equivalent to h-5 (20px), a 1.25x scale — so the icon carries more
// weight once the label's gone. Driven as an explicit `scale` tween on
// isCollapsed (own transition, own timing) rather than swapping Tailwind size
// classes, which would jump in a single frame with nothing in between. It's a
// pure transform (no layout impact), so the 4px of overflow past the 16px
// content box on each axis is safe — nothing in the row or nav clips it.
const ICON_COLLAPSED_SCALE = 1.25
// Shared hover/tap micro-interaction for every icon — the ancestor row's
// `motion.div initial="initial" whileHover="hover" whileTap="tap"` drives
// this via variant propagation, so this object is identical everywhere it's
// used and worth naming once rather than re-typing at every row.
const HOVER_TAP_VARIANTS = {
  initial: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
}

export function AppLayout({
  children,
  initialNavPreferences,
  initialQuickActionPreferences,
  initialNotificationPreferences,
  canInvite = false,
  globalSettings
}: {
  children: React.ReactNode
  initialNavPreferences?: { href: string; visible: boolean }[]
  initialQuickActionPreferences?: QuickActionPreference[]
  initialNotificationPreferences?: { tone: string; dnd: boolean }
  canInvite?: boolean
  globalSettings?: {
    termsUrl?: string | null;
    privacyUrl?: string | null;
    supportEmail?: string | null;
  }
}) {
  const [isCommandOpen, setIsCommandOpen] = useState(false)
  const [isPinned, setIsPinned] = useState(false)
  const [isHoverPeekEnabled, setIsHoverPeekEnabled] = useState(false)
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
    const savedPinned = localStorage.getItem('cutline_sidebar_pinned')
    if (savedPinned) setIsPinned(JSON.parse(savedPinned))
    // Off by default: a click-to-toggle rail is the primary interaction now,
    // so hovering the collapsed rail no longer expands it unless a user has
    // explicitly opted back into the old hover-peek behavior.
    const savedHoverPeek = localStorage.getItem('cutline_sidebar_hover_peek')
    if (savedHoverPeek) setIsHoverPeekEnabled(JSON.parse(savedHoverPeek))
  }, [])

  // Clear navigating state immediately when the route actually changes
  React.useEffect(() => {
    setIsNavigating(false)
    setOptimisticPathname(null)
  }, [pathname])

  // Toggle Clerk member-hiding CSS class on body based on subscription plan
  React.useEffect(() => {
    if (!canInvite) {
      document.body.classList.add('clerk-no-members')
    } else {
      document.body.classList.remove('clerk-no-members')
    }
    return () => {
      document.body.classList.remove('clerk-no-members')
    }
  }, [canInvite])

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

  const isExpanded = isPinned || isDropdownOpen || (isHoverPeekEnabled && isHovered)
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

  // Section-aware nav: membership in a section is fixed by NAV_SECTIONS —
  // preferences only reorder/hide items *within* their section, they never
  // move an item across sections (that's also how the settings editor's
  // drag-and-drop is constrained now). Members never get the custom saved
  // order (matches the previous flat-list behavior) — only role-based
  // filtering applies to them. A section is dropped entirely once it has no
  // visible items left, so e.g. an org:member never sees an empty "Business"
  // header.
  const navSections = React.useMemo(() => {
    const isMember = orgRole !== 'org:admin'
    const restricted = ['/dashboard/financials', '/dashboard/analytics', '/dashboard/settings', '/dashboard/archive', '/dashboard/clients']
    const useCustomOrder = !isMember && initialNavPreferences && initialNavPreferences.length > 0
    const preferenceMap = useCustomOrder ? new Map(initialNavPreferences!.map(p => [p.href, p])) : null
    const preferenceIndex = useCustomOrder ? new Map(initialNavPreferences!.map((p, i) => [p.href, i])) : null

    return NAV_SECTIONS.map(section => {
      let items = section.items

      if (isMember) {
        items = items.filter(item => !restricted.some(r => item.href.startsWith(r)))
      }

      if (preferenceMap && preferenceIndex) {
        items = items
          .filter(item => {
            const pref = preferenceMap.get(item.href)
            return pref ? pref.visible : true
          })
          .slice()
          .sort((a, b) => {
            const indexA = preferenceIndex.get(a.href) ?? Number.MAX_SAFE_INTEGER
            const indexB = preferenceIndex.get(b.href) ?? Number.MAX_SAFE_INTEGER
            return indexA - indexB
          })
      }

      return { ...section, items }
    }).filter(section => section.items.length > 0)
  }, [initialNavPreferences, orgRole])

  // Flat ordered view for the mobile bottom bar / drawer, which don't render
  // section headers and just need a single list to slice.
  const navItemsFlat = React.useMemo(() => navSections.flatMap(s => s.items), [navSections])

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

  // Contextual header title: longest-prefix match against every nav item
  // (plus Settings, which isn't in the nav list) so nested routes like a
  // project detail page still resolve to their parent section's label.
  const getContextualTitle = React.useCallback(() => {
    const candidates = [...ALL_NAV_ITEMS, { label: 'Settings', href: '/dashboard/settings' }]
    const match = candidates
      .filter(c => pathname === c.href || pathname.startsWith(`${c.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]
    return match?.label ?? null
  }, [pathname])

  const contextualTitle = getContextualTitle()

  return (
    <MotionConfig reducedMotion="user">
    <TooltipProvider delay={300} closeDelay={0}>
    <div className="flex h-[100dvh] w-full bg-background text-foreground overflow-hidden font-sans">

      {/* LEFT SIDEBAR */}
      <motion.aside
        ref={sidebarRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{ width: isExpanded ? 256 : 64 }}
        transition={SIDEBAR_TRANSITION}
        style={{ willChange: 'width' }}
        className="hidden md:flex border-r border-sidebar-border bg-sidebar flex-col z-20"
      >
        {/* Business Switcher Top Header */}
        <div className={`h-14 flex items-center border-b border-sidebar-border overflow-hidden shrink-0 relative transition-[padding] duration-300 ${isCollapsed ? 'px-0 justify-center' : 'px-4'}`}>
          {/* Kept permanently mounted (never conditionally unmounted) so Clerk's
              popover state and the aria-expanded MutationObserver never drop out
              mid-toggle; it crossfades via opacity/width instead of display:none,
              which is what makes the fade actually visible. */}
          <motion.div
            animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : '100%' }}
            transition={SIDEBAR_TRANSITION}
            style={{ pointerEvents: isCollapsed ? 'none' : 'auto' }}
            aria-hidden={isCollapsed}
            className="flex items-center overflow-hidden"
          >
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
                  organizationPreview: "gap-3 items-center",
                  ...(canInvite ? {} : {
                    organizationPreviewSecondaryIdentifier: "!hidden",
                    organizationSwitcherPopoverActionButton__manageMembers: "!hidden",
                  })
                }
              }}
              organizationProfileProps={{
                appearance: {
                  elements: {
                    ...(canInvite ? {} : {
                      membersPageInviteButton: "!hidden",
                      'profilePage__organizationMembers': "!hidden",
                      'navbar-item__members': "!hidden",
                      organizationProfilePage__members: "!hidden",
                      organizationProfilePageLink__members: "!hidden",
                      organizationProfileNavbarItem__members: "!hidden",
                    })
                  }
                }
              }}
            />
          </motion.div>
          <motion.div
            animate={{ opacity: isCollapsed ? 1 : 0, scale: isCollapsed ? 1 : 0.85 }}
            transition={SIDEBAR_TRANSITION}
            style={{ pointerEvents: isCollapsed ? 'auto' : 'none' }}
            aria-hidden={!isCollapsed}
            className="absolute flex justify-center items-center w-8 h-8 text-foreground font-bold"
          >
            {organization?.imageUrl ? (
              <img src={organization.imageUrl} alt={organization.name} className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-md object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-md bg-muted/50 flex items-center justify-center shrink-0 text-sm">C</div>
            )}
          </motion.div>
        </div>

        {/* Collapse toggle + Search — chrome controls, not navigation, so they
            sit above the nav list rather than buried in the bottom stack. */}
        <div className="px-3 py-3 space-y-1 border-b border-sidebar-border shrink-0">
          <Tooltip>
            <TooltipTrigger disabled={!isCollapsed} render={<span className="contents" />}>
              <motion.div initial="initial" whileHover="hover" whileTap="tap">
                <button
                  onClick={togglePin}
                  aria-label={isPinned ? 'Collapse sidebar' : 'Expand sidebar'}
                  className="group relative z-0 w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                >
                  <motion.div
                    animate={{ scale: isCollapsed ? ICON_COLLAPSED_SCALE : 1 }}
                    transition={SIDEBAR_TRANSITION}
                  >
                    <motion.div variants={HOVER_TAP_VARIANTS} transition={ICON_SPRING}>
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isPinned ? 'chevron-left' : 'chevron-right'}
                          className="flex"
                          initial={{ opacity: 0, rotate: -40, scale: 0.7 }}
                          animate={{ opacity: 1, rotate: 0, scale: 1 }}
                          exit={{ opacity: 0, rotate: 40, scale: 0.7 }}
                          transition={ICON_SPRING}
                        >
                          {isPinned ? (
                            <ChevronLeft className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        key="toggle-label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={SIDEBAR_TRANSITION}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {isPinned ? 'Collapse Sidebar' : 'Expand Sidebar'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="right">{isPinned ? 'Collapse sidebar' : 'Expand sidebar'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger disabled={!isCollapsed} render={<span className="contents" />}>
              <motion.div initial="initial" whileHover="hover" whileTap="tap">
                <button
                  onClick={() => setIsCommandOpen(true)}
                  className="group relative z-0 w-full flex items-center justify-between px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                >
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      animate={{ scale: isCollapsed ? ICON_COLLAPSED_SCALE : 1 }}
                      transition={SIDEBAR_TRANSITION}
                    >
                      <motion.div variants={HOVER_TAP_VARIANTS} transition={ICON_SPRING}>
                        <Search className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                      </motion.div>
                    </motion.div>
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.span
                          key="search-text"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={SIDEBAR_TRANSITION}
                          className="whitespace-nowrap overflow-hidden"
                        >
                          Search...
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        key="search-badge"
                        initial={{ opacity: 0, scale: 0.8, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.8, x: -10 }}
                        transition={SIDEBAR_TRANSITION}
                        className="flex items-center text-xs opacity-50 bg-muted/50 border border-border px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 font-normal"
                      >
                        <CmdIcon className="h-3 w-3 mr-0.5 shrink-0" /> K
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="right">Search (⌘K)</TooltipContent>
          </Tooltip>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 min-h-0">
          <nav className="py-3 px-3 space-y-4">
            {navSections.map((section) => (
              <div key={section.id} className="space-y-1">
                {section.label && (
                  <div className="h-5 flex items-center px-3">
                    <AnimatePresence mode="wait" initial={false}>
                      {isCollapsed ? (
                        <motion.div
                          key="separator"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={SIDEBAR_TRANSITION}
                          className="w-full"
                        >
                          <Separator />
                        </motion.div>
                      ) : (
                        <motion.span
                          key="label"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={SIDEBAR_TRANSITION}
                          className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider whitespace-nowrap"
                        >
                          {section.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                )}
                {section.items.map((item) => {
                  const currentPath = optimisticPathname || pathname
                  const isActive = currentPath === item.href || (item.href !== '/dashboard' && currentPath.startsWith(item.href))
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger disabled={!isCollapsed} render={<span className="contents" />}>
                        <motion.div
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
                            aria-current={isActive ? 'page' : undefined}
                            className={`group relative z-0 flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${isActive
                                ? 'text-foreground font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60'
                              }`}
                          >
                            {isActive && (
                              <>
                                <motion.div
                                  layoutId="activeNavPill"
                                  className="absolute inset-0 bg-sidebar-accent rounded-lg -z-10"
                                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                                <motion.div
                                  layoutId="activeNavIndicator"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-indigo-500 dark:bg-indigo-400"
                                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                />
                              </>
                            )}
                            <motion.div
                              animate={{ scale: isCollapsed ? ICON_COLLAPSED_SCALE : 1 }}
                              transition={SIDEBAR_TRANSITION}
                            >
                              <motion.div variants={HOVER_TAP_VARIANTS} transition={ICON_SPRING}>
                                <item.icon className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                              </motion.div>
                            </motion.div>
                            <AnimatePresence initial={false}>
                              {!isCollapsed && (
                                <motion.span
                                  key="nav-label"
                                  initial={{ opacity: 0, width: 0 }}
                                  animate={{ opacity: 1, width: 'auto' }}
                                  exit={{ opacity: 0, width: 0 }}
                                  transition={SIDEBAR_TRANSITION}
                                  className="whitespace-nowrap overflow-hidden"
                                >
                                  {item.label}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </Link>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-sidebar-border space-y-1 shrink-0">
          <Tooltip>
            <TooltipTrigger disabled={!isCollapsed} render={<span className="contents" />}>
              <motion.div initial="initial" whileHover="hover" whileTap="tap">
                <button
                  onClick={() => setIsCurrencyConverterOpen(true)}
                  className="group relative z-0 w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
                >
                  <motion.div
                    animate={{ scale: isCollapsed ? ICON_COLLAPSED_SCALE : 1 }}
                    transition={SIDEBAR_TRANSITION}
                  >
                    <motion.div variants={HOVER_TAP_VARIANTS} transition={ICON_SPRING}>
                      <Calculator className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                    </motion.div>
                  </motion.div>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.span
                        key="currency-label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={SIDEBAR_TRANSITION}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        Currency Converter
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent side="right">Currency Converter</TooltipContent>
          </Tooltip>

          {isAdmin && (
            <Tooltip>
              <TooltipTrigger disabled={!isCollapsed} render={<span className="contents" />}>
                <motion.div initial="initial" whileHover="hover" whileTap="tap">
                  <Link
                    href="/dashboard/settings"
                    aria-current={(optimisticPathname || pathname)?.startsWith('/dashboard/settings') ? 'page' : undefined}
                    className={`group relative z-0 flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors ${
                      (optimisticPathname || pathname)?.startsWith('/dashboard/settings')
                        ? 'text-foreground font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60'
                    }`}
                  >
                    {(optimisticPathname || pathname)?.startsWith('/dashboard/settings') && (
                      <>
                        <motion.div
                          layoutId="activeNavPill"
                          className="absolute inset-0 bg-sidebar-accent rounded-lg -z-10"
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full bg-indigo-500 dark:bg-indigo-400"
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                      </>
                    )}
                    <motion.div
                      animate={{ scale: isCollapsed ? ICON_COLLAPSED_SCALE : 1 }}
                      transition={SIDEBAR_TRANSITION}
                    >
                      <motion.div variants={HOVER_TAP_VARIANTS} transition={ICON_SPRING}>
                        <Settings className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
                      </motion.div>
                    </motion.div>
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.span
                          key="settings-label"
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={SIDEBAR_TRANSITION}
                          className="whitespace-nowrap overflow-hidden"
                        >
                          Settings
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="right">Settings</TooltipContent>
            </Tooltip>
          )}

          <ThemeToggle isCollapsed={isCollapsed} />

          {globalSettings && (!isCollapsed) && (
            <div className="pt-3 mt-3 border-t border-sidebar-border flex flex-wrap gap-x-3 gap-y-1 px-3 text-[10px] text-muted-foreground/70 uppercase tracking-wider">
              {globalSettings.supportEmail && (
                <a href={`mailto:${globalSettings.supportEmail}`} className="hover:text-foreground transition-colors">Support</a>
              )}
              {globalSettings.termsUrl && (
                <a href={globalSettings.termsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Terms</a>
              )}
              {globalSettings.privacyUrl && (
                <a href={globalSettings.privacyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Privacy</a>
              )}
            </div>
          )}
        </div>
      </motion.aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Contextual Top bar */}
        <header className="h-14 flex items-center justify-between px-3 md:px-6 border-b border-sidebar-border bg-background shrink-0">
          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1 pr-2">
            <div className="hidden md:flex items-center gap-2 shrink-0 min-w-0">
              <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0">
                <img src="/icon.svg" alt="Cutline OS Logo" className="w-full h-full object-contain dark:invert" />
              </div>
              <h1 className="text-base font-bold tracking-tight truncate flex items-center gap-1.5 min-w-0">
                <span className={contextualTitle ? 'text-muted-foreground font-medium shrink-0' : 'text-foreground shrink-0'}>Cutline OS</span>
                {contextualTitle && (
                  <>
                    <span className="text-muted-foreground/40 shrink-0">/</span>
                    <span className="text-foreground truncate">{contextualTitle}</span>
                  </>
                )}
              </h1>
            </div>
            <div className="md:hidden min-w-0 flex-1">
              <OrganizationSwitcher
                hidePersonal
                appearance={{
                  elements: {
                    organizationSwitcherTrigger: "focus:shadow-none focus:outline-none justify-start px-0 py-0 min-w-0 max-w-[130px] sm:max-w-[200px]",
                    organizationPreviewMainIdentifier: "font-semibold text-sm truncate",
                    organizationPreview: "min-w-0 overflow-hidden",
                    ...(canInvite ? {} : {
                      organizationPreviewSecondaryIdentifier: "!hidden",
                      organizationSwitcherPopoverActionButton__manageMembers: "!hidden",
                    })
                  }
                }}
                organizationProfileProps={{
                  appearance: {
                    elements: {
                      ...(canInvite ? {} : {
                        membersPageInviteButton: "!hidden",
                        'profilePage__organizationMembers': "!hidden",
                        'navbar-item__members': "!hidden",
                        organizationProfilePage__members: "!hidden",
                        organizationProfilePageLink__members: "!hidden",
                        organizationProfileNavbarItem__members: "!hidden",
                      })
                    }
                  }
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-0 sm:gap-1 md:gap-2 shrink-0">
            <button
              onClick={() => setIsCommandOpen(true)}
              className="md:hidden p-2 text-muted-foreground hover:bg-muted/50 rounded-full transition-colors flex items-center justify-center shrink-0"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="md:hidden flex items-center justify-center p-2 shrink-0">
              <ThemeToggle isCollapsed={true} variant="icon" />
            </div>
            <button
              onClick={() => setIsQuickActionsOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground shadow-sm hover:opacity-90 transition-opacity shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>
            <div className="shrink-0">
              <NotificationCenter initialPrefs={initialNotificationPreferences} />
            </div>
            <div className="flex items-center justify-center p-1 shrink-0 ml-1">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "w-8 h-8",
                  }
                }}
              />
            </div>
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
              style={{ willChange: 'opacity' }}
              onClick={() => setIsQuickActionsOpen(false)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {isQuickActionsOpen && (
            <motion.aside
              aria-label="Quick Actions"
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l border-border/50 bg-background/60 backdrop-blur-xl shadow-2xl"
              initial={{ x: '100%', opacity: 0.98 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.98 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="p-6">
                <div className="mb-8 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
                  <button
                    type="button"
                    onClick={() => setIsQuickActionsOpen(false)}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                        className="block p-4 rounded-xl border border-border/50 bg-muted/20 hover:border-border transition-colors"
                      >
                        <div className="font-medium text-foreground text-sm">{action.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{action.description}</div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground italic p-4 text-center">No quick actions enabled.</div>
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/60 backdrop-blur-xl border-t border-border/50 grid grid-cols-5 h-[68px] shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)]">
        {navItemsFlat.slice(0, 4).map((item) => {
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
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${isMobileMenuOpen ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
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
              style={{ willChange: 'opacity' }}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              style={{ willChange: 'transform' }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] border-t border-border/50"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <h2 className="text-lg font-semibold text-foreground pl-2">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <div className="grid grid-cols-2 gap-2">
                  {navItemsFlat.slice(4).map((item) => {
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
                            ? 'bg-primary border-primary text-primary-foreground shadow-sm font-medium'
                            : 'bg-muted/30 border-transparent text-foreground hover:bg-muted/50 transition-colors'
                        }`}
                      >
                        <item.icon className="w-5 h-5 shrink-0 text-muted-foreground" />
                        <span className="text-sm">{item.label}</span>
                      </Link>
                    )
                  })}
                </div>

                <div className="h-[1px] w-full bg-border/50" />

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-3">Tools & Preferences</h3>

                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      setIsCurrencyConverterOpen(true)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent bg-muted/30 text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <Calculator className="w-5 h-5 shrink-0 text-muted-foreground" />
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
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent bg-muted/30 text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Settings className="w-5 h-5 shrink-0 text-muted-foreground" />
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
    </TooltipProvider>
    </MotionConfig>
  )
}
