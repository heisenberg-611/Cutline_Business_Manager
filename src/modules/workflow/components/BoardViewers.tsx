'use client'

import type { BoardViewer } from '../hooks/usePipelineRealtime'

const MAX_SHOWN = 4

/**
 * Avatars of teammates currently on the board.
 *
 * Excludes the current user (the hook filters them out) — seeing yourself in a
 * "who else is here" list is noise.
 */
export function BoardViewers({ viewers }: { viewers: BoardViewer[] }) {
  if (viewers.length === 0) return null

  const shown = viewers.slice(0, MAX_SHOWN)
  const overflow = viewers.length - shown.length

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-zinc-500 sm:inline">Viewing now</span>
      <div className="flex -space-x-2">
        {shown.map((viewer) => (
          <span
            key={viewer.clientId}
            title={viewer.name}
            className="relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-zinc-200 text-[10px] font-semibold uppercase text-zinc-600 dark:border-zinc-900 dark:bg-zinc-700 dark:text-zinc-200"
          >
            {viewer.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewer.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              viewer.name.slice(0, 2)
            )}
          </span>
        ))}
        {overflow > 0 && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-[10px] font-semibold text-zinc-500 dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-400">
            +{overflow}
          </span>
        )}
      </div>
    </div>
  )
}
