'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
/**
 * Someone currently looking at a shared page.
 *
 * Defined here rather than beside a hook, because both the pipeline board and
 * the project collaboration page publish presence and render it identically.
 */
export type PresenceViewer = {
  clientId: string
  name: string
  imageUrl?: string | null
}

/**
 * Avatars fit comfortably up to this many; past it the row starts crowding the
 * board controls beside it, so the remainder moves into a dropdown.
 */
const MAX_SHOWN = 8

function Avatar({ viewer, className = '' }: { viewer: PresenceViewer; className?: string }) {
  return (
    <span
      className={`relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-zinc-200 text-[10px] font-semibold uppercase text-zinc-600 dark:border-zinc-900 dark:bg-zinc-700 dark:text-zinc-200 ${className}`}
    >
      {viewer.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={viewer.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        viewer.name.slice(0, 2)
      )}
    </span>
  )
}

/**
 * Teammates currently on this page.
 *
 * Excludes the current user (the hooks filter them out) — seeing yourself in a
 * "who else is here" list is noise.
 */
export function PresenceAvatars({ viewers }: { viewers: PresenceViewer[] }) {
  if (viewers.length === 0) return null

  const shown = viewers.slice(0, MAX_SHOWN)
  const overflow = viewers.slice(MAX_SHOWN)

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs text-zinc-500 sm:inline">Viewing now</span>
      <div className="flex -space-x-2">
        {shown.map((viewer) => (
          <Avatar key={viewer.clientId} viewer={viewer} />
        ))}

        {overflow.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-100 text-[10px] font-semibold text-zinc-600 outline-none transition-colors hover:bg-zinc-200 dark:border-zinc-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              aria-label={`Show ${overflow.length} more ${overflow.length === 1 ? 'viewer' : 'viewers'}`}
            >
              +{overflow.length}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
              <DropdownMenuLabel>
                {overflow.length} more viewing
              </DropdownMenuLabel>
              {overflow.map((viewer) => (
                // Not DropdownMenuItem: these are not actions, and rendering
                // them as menu items would make them look clickable.
                <div
                  key={viewer.clientId}
                  className="flex items-center gap-2 px-2 py-1.5 text-sm"
                >
                  <Avatar viewer={viewer} className="h-6 w-6 border-0 text-[9px]" />
                  <span className="truncate text-zinc-700 dark:text-zinc-300">
                    {viewer.name}
                  </span>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}
