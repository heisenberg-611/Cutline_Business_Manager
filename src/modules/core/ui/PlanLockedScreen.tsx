import Link from 'next/link'
import { Lock } from 'lucide-react'

/**
 * The one locked-feature screen. Every gated section renders this rather than
 * its own copy, so a locked feature looks and reads the same wherever it is met.
 */
export function PlanLockedScreen({
  tier,
  description,
  action = { href: '/dashboard/settings/billing', label: 'View Plans & Upgrade' },
}: {
  /** Plan that unlocks the feature — used as the heading. */
  tier: 'Pro' | 'Business'
  description: string
  /** Overridable because not every lock is resolved by upgrading. */
  action?: { href: string; label: string } | null
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-zinc-400" />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        {tier} Feature
      </h2>
      <p className="text-zinc-500 max-w-md mb-8">{description}</p>
      {action && (
        <Link
          href={action.href}
          className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
