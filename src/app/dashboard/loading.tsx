
import React from 'react'

// Skeleton block helper — keeps code DRY
function SkeletonBlock({ className, delay = 0 }: { className: string; delay?: number }) {
  return (
    <div
      className={`animate-shimmer rounded ${className} dark:[--shimmer-from:var(--color-zinc-900)] dark:[--shimmer-to:var(--color-zinc-800)]`}
      style={{
        animationDelay: `${delay}s`,
        // Tailwind v4 dark mode via CSS vars:
        '--shimmer-from': 'var(--color-zinc-100)',
        '--shimmer-to': 'var(--color-zinc-200)',
      } as React.CSSProperties}
      // Override for dark mode (Tailwind v4 dark: variant):
      data-theme="dark"
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="w-full space-y-6">
      {/* Optional: Vercel-style glimmer track at top */}
      <div className="h-0.5 w-full animate-shimmer rounded-full" />

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div className="space-y-3">
          <SkeletonBlock className="h-6 w-48" delay={0} />
          <SkeletonBlock className="h-4 w-72" delay={0.1} />
        </div>
        <SkeletonBlock className="h-10 w-32 rounded-lg hidden sm:block" delay={0.2} />
      </div>
      
      {/* Content Skeleton */}
      <div className="bg-white dark:bg-zinc-950/50 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Table Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex gap-12">
            <SkeletonBlock className="h-4 w-32" delay={0.15} />
            <SkeletonBlock className="h-4 w-24" delay={0.2} />
            <SkeletonBlock className="h-4 w-24" delay={0.25} />
          </div>
        </div>
        
        {/* Staggered rows — each row has its own shimmer offset */}
        {[0.1, 0.2, 0.3, 0.4, 0.5].map((rowDelay, i) => (
          <div
            key={i}
            className="flex items-center gap-6 p-4 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
          >
            <div className="space-y-2 flex-1">
              <SkeletonBlock className="h-4 w-1/3" delay={rowDelay} />
              <SkeletonBlock className="h-3 w-1/4" delay={rowDelay + 0.05} />
            </div>
            <SkeletonBlock className="h-6 w-20 rounded-full" delay={rowDelay + 0.1} />
            <SkeletonBlock className="h-8 w-8 rounded-md shrink-0" delay={rowDelay + 0.15} />
          </div>
        ))}
      </div>
    </div>
  )
}
