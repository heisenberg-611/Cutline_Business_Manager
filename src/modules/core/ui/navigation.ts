import {
  LayoutDashboard,
  MessageCircle,
  Kanban,
  Briefcase,
  Clapperboard,
  Users,
  CircleDollarSign,
  TrendingUp,
  Package,
  Star,
  Archive,
  LucideIcon
} from 'lucide-react'

export type NavItem = { label: string; icon: LucideIcon; href: string }

export type NavSection = {
  id: string
  // null = rendered as the top, un-headered block
  label: string | null
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'top',
    label: null,
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
      { label: 'Messages', icon: MessageCircle, href: '/dashboard/messages' },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    items: [
      { label: 'Pipeline', icon: Kanban, href: '/dashboard/pipeline' },
      { label: 'Projects', icon: Briefcase, href: '/dashboard/projects' },
      { label: 'ProdP', icon: Clapperboard, href: '/dashboard/prodp' },
      { label: 'Assets', icon: Package, href: '/dashboard/assets' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    items: [
      { label: 'Clients', icon: Users, href: '/dashboard/clients' },
      { label: 'Financials', icon: CircleDollarSign, href: '/dashboard/financials' },
      { label: 'Analytics', icon: TrendingUp, href: '/dashboard/analytics' },
    ],
  },
  {
    id: 'more',
    label: 'More',
    items: [
      { label: 'Feedback', icon: Star, href: '/dashboard/feedback' },
      { label: 'Archive', icon: Archive, href: '/dashboard/archive' },
    ],
  },
]

// Flat, ordered view of every nav item — the shape presets.ts, settings
// actions, and the nav preferences editor all depend on and were built
// against before sections existed. Keep this derived, not hand-maintained,
// so section membership stays the single source of truth.
export const ALL_NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(s => s.items)

export type NavPreference = { href: string; visible: boolean }
