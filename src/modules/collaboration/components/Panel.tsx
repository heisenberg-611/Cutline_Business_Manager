import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * The card shell every collaboration panel sits in.
 *
 * Members, Tasks, Discussion and Activity had four hand-rolled copies of this
 * chrome that had drifted apart; sharing one keeps the header, counter and
 * footer identical across all of them.
 */
/**
 * How tall a panel's body may grow before it scrolls inside itself.
 *
 * Viewport-relative so the cards use the screen they are given: a tall monitor
 * shows more rows before scrolling, a laptop shows fewer. The clamp keeps it
 * sane at both ends — never shorter than a few rows, never so tall that the
 * page turns back into an endless scroll on a large display.
 *
 * Both are `sm:`-only on purpose. A scroll container inside a scrolling page is
 * miserable on a phone, so below `sm` the panels just grow and the page scrolls.
 */
export const PANEL_SCROLL_MAIN = 'sm:max-h-[clamp(20rem,52vh,50rem)]'
export const PANEL_SCROLL_SIDE = 'sm:max-h-[clamp(16rem,42vh,38rem)]'

export function Panel({
  icon: Icon,
  title,
  count,
  action,
  footer,
  children,
  /**
   * Pass PANEL_SCROLL_MAIN or PANEL_SCROLL_SIDE to cap the body and scroll it.
   * Left off for the discussion: its @ picker is absolutely positioned inside
   * the body, and a scroll container would clip it.
   */
  scrollClassName,
  /**
   * Fills the leftover height of its column, so the card's bottom edge lines up
   * with the taller column beside it — its body scrolls instead of the card
   * growing.
   *
   * `xl:` only, because that is where the two-column layout exists. Below it
   * every card is its own grid row with no slack to absorb, and `flex-1`
   * (flex-basis 0) would collapse the card rather than fill it.
   */
  grow = false,
  /**
   * Clips content to the card's rounded corners. Off for the discussion panel:
   * its @ picker is positioned above the composer and has to escape the card,
   * and clipping cut it off. Radix popovers (the Select menus) portal out, so
   * they are unaffected either way.
   */
  clip = true,
}: {
  icon: LucideIcon
  title: string
  count?: ReactNode
  action?: ReactNode
  footer?: ReactNode
  children: ReactNode
  scrollClassName?: string
  grow?: boolean
  clip?: boolean
}) {
  return (
    <section
      className={`flex flex-col rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${
        grow ? 'xl:min-h-0 xl:flex-1' : ''
      } ${clip ? 'overflow-hidden' : ''}`}
    >
      <header className="flex items-center gap-2.5 rounded-t-xl border-b border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h3>
        {count !== undefined && count !== null && (
          <span className="rounded-full border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            {count}
          </span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </header>

      {scrollClassName ? (
        // overscroll-contain stops a scroll that reaches the panel's end from
        // running on and scrolling the page behind it.
        // When growing, the vh cap is dropped at xl: the column's height is the
        // bound instead, otherwise the cap would stop the body short of the
        // bottom edge it is meant to reach.
        <div
          className={`sm:overflow-y-auto sm:overscroll-contain ${scrollClassName} ${
            grow ? 'xl:max-h-none xl:min-h-0 xl:flex-1' : ''
          }`}
        >
          {children}
        </div>
      ) : (
        children
      )}

      {footer && (
        <div className="rounded-b-xl border-t border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          {footer}
        </div>
      )}
    </section>
  )
}

/**
 * Shared empty state, so "nothing here yet" reads the same in every panel and
 * every panel reserves the same amount of room for it — the previous per-panel
 * paddings gave each empty card a different-sized void.
 */
export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="flex min-h-24 items-center justify-center px-6 py-6 text-center text-sm text-balance text-zinc-500">
      {children}
    </p>
  )
}
