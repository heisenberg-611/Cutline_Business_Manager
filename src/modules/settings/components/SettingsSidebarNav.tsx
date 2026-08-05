'use client'

import React, { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, CreditCard, Mail, Workflow, LayoutList, BellRing, UserX } from 'lucide-react'

const SETTINGS_NAV = [
  { href: '/dashboard/settings/general', label: 'General', icon: Building2 },
  { href: '/dashboard/settings/billing', label: 'Billing & Plan', icon: CreditCard },
  { href: '/dashboard/settings/invoice', label: 'Invoicing & Email', icon: Mail },
  { href: '/dashboard/settings/workflow', label: 'Pipeline & Workflow', icon: Workflow },
  { href: '/dashboard/settings/navigation', label: 'Navigation & Actions', icon: LayoutList },
  { href: '/dashboard/settings/notifications', label: 'Notifications', icon: BellRing },
  { href: '/dashboard/settings/account', label: 'Account', icon: UserX },
]

export function SettingsSidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimisticPath, setOptimisticPath] = useState<string | null>(null)

  useEffect(() => {
    setOptimisticPath(null)
  }, [pathname])

  const activePath = optimisticPath || pathname

  return (
    <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-1 px-1 lg:mx-0 lg:px-0 pb-2 lg:pb-0">
      {SETTINGS_NAV.map(({ href, label, icon: Icon }) => {
        const active = activePath === href || activePath?.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={(e) => {
              e.preventDefault()
              setOptimisticPath(href)
              startTransition(() => {
                router.push(href)
              })
            }}
            className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0 ${
              active
                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
