import { 
  Briefcase, 
  Users, 
  FolderKanban, 
  Kanban,
  Wallet, 
  BarChart3,
  Box,
  Archive,
  MessageSquare,
  MessageCircle,
  Video
} from 'lucide-react'

export const ALL_NAV_ITEMS = [
  { label: 'Dashboard', icon: Briefcase, href: '/dashboard' },
  { label: 'Messages', icon: MessageCircle, href: '/dashboard/messages' },
  { label: 'Pipeline', icon: Kanban, href: '/dashboard/pipeline' },
  { label: 'Projects', icon: FolderKanban, href: '/dashboard/projects' },
  { label: 'ProdP', icon: Video, href: '/dashboard/prodp' },
  { label: 'Clients', icon: Users, href: '/dashboard/clients' },
  { label: 'Financials', icon: Wallet, href: '/dashboard/financials' },
  { label: 'Analytics', icon: BarChart3, href: '/dashboard/analytics' },
  { label: 'Assets', icon: Box, href: '/dashboard/assets' },
  { label: 'Feedback', icon: MessageSquare, href: '/dashboard/feedback' },
  { label: 'Archive', icon: Archive, href: '/dashboard/archive' },
]

export type NavItem = typeof ALL_NAV_ITEMS[0]
export type NavPreference = { href: string; visible: boolean }
