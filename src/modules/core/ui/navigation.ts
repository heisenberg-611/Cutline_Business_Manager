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
  Archive
} from 'lucide-react'

export const ALL_NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Messages', icon: MessageCircle, href: '/dashboard/messages' },
  { label: 'Pipeline', icon: Kanban, href: '/dashboard/pipeline' },
  { label: 'Projects', icon: Briefcase, href: '/dashboard/projects' },
  { label: 'ProdP', icon: Clapperboard, href: '/dashboard/prodp' },
  { label: 'Clients', icon: Users, href: '/dashboard/clients' },
  { label: 'Financials', icon: CircleDollarSign, href: '/dashboard/financials' },
  { label: 'Analytics', icon: TrendingUp, href: '/dashboard/analytics' },
  { label: 'Assets', icon: Package, href: '/dashboard/assets' },
  { label: 'Feedback', icon: Star, href: '/dashboard/feedback' },
  { label: 'Archive', icon: Archive, href: '/dashboard/archive' },
]

export type NavItem = typeof ALL_NAV_ITEMS[0]
export type NavPreference = { href: string; visible: boolean }
