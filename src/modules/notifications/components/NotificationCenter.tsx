"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  Bell,
  Check,
  ChevronRight,
  FolderKanban,
  ListChecks,
  Loader2,
  MessageSquare,
  Settings2,
  Star,
  Trash2,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { getNotifications, markAsRead, markAllAsRead, clearAllNotifications } from "../actions"
import { useNotificationsRealtime } from "../useNotificationsRealtime"
import {
  coercePrefs,
  DEFAULT_NOTIFICATION_PREFS,
  playNotificationFor,
  subscribeToPrefs,
  type NotificationPrefs,
} from "../sound"
import { cn } from "@/lib/utils"

type Notification = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  actionUrl: string | null
  createdAt: Date
}

const TICK_MS = 30_000

// The `type` column is free-form text written by whoever created the row, so a
// Map keeps an unrecognised value (or one colliding with an Object prototype
// key) from resolving to something it shouldn't.
const TYPE_GROUPS = new Map<string, { label: string; icon: LucideIcon }>([
  ['project', { label: 'Projects', icon: FolderKanban }],
  ['message', { label: 'Messages', icon: MessageSquare }],
  ['task', { label: 'Tasks', icon: ListChecks }],
  ['feedback', { label: 'Feedback', icon: Star }],
  ['system', { label: 'System', icon: Settings2 }],
])

const OTHER_GROUP = { label: 'Other', icon: Bell }

type NotificationGroup = {
  key: string
  label: string
  icon: LucideIcon
  items: Notification[]
  unread: number
}

function groupByType(notifications: Notification[]): NotificationGroup[] {
  const byKey = new Map<string, NotificationGroup>()

  for (const notification of notifications) {
    const meta = TYPE_GROUPS.get(notification.type)
    const key = meta ? notification.type : 'other'

    let group = byKey.get(key)
    if (!group) {
      const { label, icon } = meta ?? OTHER_GROUP
      group = { key, label, icon, items: [], unread: 0 }
      byKey.set(key, group)
    }

    group.items.push(notification)
    if (!notification.isRead) group.unread++
  }

  // No sort needed: the server hands rows back newest-first, so a Map keyed in
  // encounter order already lists groups by how recent their newest item is —
  // whatever just happened stays at the top of the pane.
  return [...byKey.values()]
}

function timeAgo(date: Date, now: number) {
  // Clamp: a row created a moment ago can read as slightly in the future when
  // the server clock leads the browser's, and "-2s ago" looks broken.
  const seconds = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000))
  if (seconds < 5) return "just now"
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function NotificationRow({
  notification,
  now,
  onOpen,
  onMarkAsRead
}: {
  notification: Notification
  now: number
  onOpen: (notification: Notification) => void
  onMarkAsRead: (id: string) => void
}) {
  return (
    <div
      // Reachable by keyboard, not only by pointer, when there is somewhere to go.
      role={notification.actionUrl ? "button" : undefined}
      tabIndex={notification.actionUrl ? 0 : undefined}
      onClick={() => onOpen(notification)}
      onKeyDown={(e) => {
        if (!notification.actionUrl) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(notification)
        }
      }}
      className={cn(
        "relative flex gap-3 rounded-lg p-3 pr-10 text-sm transition-colors cursor-default group",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        notification.actionUrl && "cursor-pointer",
        notification.isRead
          ? "hover:bg-zinc-50 dark:hover:bg-white/5"
          : "bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-50 dark:hover:bg-indigo-500/20"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className={cn(
            "font-medium truncate",
            notification.isRead ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-900 dark:text-zinc-100"
          )}>
            {notification.title}
          </p>
          <span className="text-[10px] whitespace-nowrap text-zinc-400 shrink-0 mt-0.5">
            {timeAgo(notification.createdAt, now)}
          </span>
        </div>
        <p className={cn(
          "line-clamp-2 leading-snug",
          notification.isRead ? "text-zinc-500 dark:text-zinc-500" : "text-zinc-600 dark:text-zinc-400"
        )}>
          {notification.message}
        </p>
      </div>

      {!notification.isRead && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMarkAsRead(notification.id)
          }}
          // Always visible where there is no hover to reveal it; it was the only
          // way to read a single item, and on a phone it could never be shown.
          className="absolute right-3 top-3 p-1 rounded-full text-indigo-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-opacity flex-shrink-0"
          title="Mark as read"
          aria-label="Mark as read"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
      {!notification.isRead && (
        <div className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-indigo-500 transition-opacity" />
      )}
    </div>
  )
}

export function NotificationCenter({ initialPrefs }: { initialPrefs?: { tone: string; dnd: boolean } }) {
  const router = useRouter()
  const { userId } = useAuth()
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [confirmingClear, setConfirmingClear] = React.useState(false)
  const [now, setNow] = React.useState(() => Date.now())
  // Collapsed rather than expanded, so a category added later starts open.
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<string>>(() => new Set())

  const groups = React.useMemo(() => groupByType(notifications), [notifications])

  const toggleGroup = React.useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (!next.delete(key)) next.add(key)
      return next
    })
  }, [])

  const prevTopNotificationId = React.useRef<string | null>(null)
  const isInitialFetch = React.useRef(true)
  // Responses can land out of order, and a refetch that started before a local
  // change must not overwrite it. Both are settled by comparing generations.
  const fetchGeneration = React.useRef(0)

  // The account row is the source of truth. localStorage used to win over it
  // unconditionally, so preferences never followed the user to another device
  // and a shared browser handed the previous person's tone to the next one.
  // It is now only a live channel for a change made on the settings page.
  const [livePrefs, setLivePrefs] = React.useState<NotificationPrefs | null>(null)
  // coerced, not cast: notificationPreferences is a free-form JSON column.
  const prefs = livePrefs ?? coercePrefs(initialPrefs) ?? DEFAULT_NOTIFICATION_PREFS

  React.useEffect(() => subscribeToPrefs(userId, setLivePrefs), [userId])

  // Held in a ref so a tone change does not re-create the fetch callback and
  // re-run the listener effect.
  const prefsRef = React.useRef(prefs)
  React.useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  const fetchNotifications = React.useCallback(async () => {
    const generation = ++fetchGeneration.current
    try {
      const data = await getNotifications()
      // A newer fetch or a local mutation has superseded this response.
      if (generation !== fetchGeneration.current) return

      setNotifications(data.notifications as Notification[])
      setUnreadCount(data.unreadCount)

      const top = data.notifications[0]
      if (isInitialFetch.current) {
        isInitialFetch.current = false
      } else if (top && !top.isRead && prevTopNotificationId.current !== top.id) {
        playNotificationFor(prefsRef.current)
      }
      if (top) prevTopNotificationId.current = top.id
    } catch (e) {
      console.error(e)
    } finally {
      // Unconditional: a superseded response must still retire the spinner, or
      // a mutation landing during the first fetch would leave it spinning.
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchNotifications()

    // Listen for real-time push from OneSignal
    const handlePushReceived = () => {
      fetchNotifications()
    }
    window.addEventListener('onesignal-push-received', handlePushReceived)

    // Returning to the tab is where a stale count is most obvious, and it costs
    // one request rather than a standing interval. This is the safety net for a
    // signal missed while the socket was down; useNotificationsRealtime below
    // is what normally delivers.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchNotifications()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('onesignal-push-received', handlePushReceived)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [fetchNotifications])

  // Delivery is pushed over Ably rather than polled. Polling cost one Vercel
  // invocation per user per interval, nearly always to find nothing new.
  useNotificationsRealtime(fetchNotifications)

  const handleOpenChange = React.useCallback((next: boolean) => {
    setOpen(next)
    // Never reopen mid-confirmation.
    setConfirmingClear(false)
    if (next) setNow(Date.now())
  }, [])

  // Relative timestamps only need to keep moving while someone is reading them;
  // they used to be frozen at whatever they said when the list last rendered.
  React.useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [open])

  React.useEffect(() => {
    const titleEl = document.querySelector('title')
    if (!titleEl) return

    const strip = (text: string) => text.replace(/^\(\d+\)\s*/, '')
    const originalTitle = strip(titleEl.textContent || document.title || '')

    const updateTitle = () => {
      const currentText = titleEl.textContent || document.title || ''
      if (!currentText) return

      const cleanTitle = strip(currentText)
      const newTitle = unreadCount > 0 ? `(${unreadCount}) ${cleanTitle}` : cleanTitle

      if (titleEl.textContent !== newTitle) {
        titleEl.textContent = newTitle
      }
      if (document.title !== newTitle) {
        document.title = newTitle
      }
    }

    updateTitle()

    const headElement = document.querySelector('head')
    if (!headElement) return

    const observer = new MutationObserver(() => {
      updateTitle()
    })

    // Observe head for any title changes Next.js might make
    observer.observe(headElement, {
      childList: true,
      subtree: true,
      characterData: true
    })

    return () => {
      observer.disconnect()
      // Hand the title back without our count, or it outlives the bell.
      const live = document.querySelector('title')
      if (live && live.textContent !== strip(live.textContent || '')) {
        live.textContent = strip(live.textContent || '')
      }
      if (document.title !== strip(document.title)) {
        document.title = strip(document.title) || originalTitle
      }
    }
  }, [unreadCount])

  /**
   * Applies a local change immediately, then reconciles with the server. On
   * failure the previous state is put back and the reader is told — silently
   * keeping the optimistic view meant the rows reappeared later with no
   * explanation.
   */
  const mutate = React.useCallback(
    async (
      apply: (current: Notification[]) => { notifications: Notification[]; unreadCount: number },
      commit: () => Promise<void>,
      failureMessage: string
    ) => {
      const previousNotifications = notifications
      const previousUnread = unreadCount
      // Claim the current generation so an in-flight refetch cannot land on top
      // of this change.
      fetchGeneration.current++

      const next = apply(notifications)
      setNotifications(next.notifications)
      setUnreadCount(next.unreadCount)

      try {
        await commit()
      } catch (e) {
        console.error(e)
        setNotifications(previousNotifications)
        setUnreadCount(previousUnread)
        toast.error(failureMessage)
      }
    },
    [notifications, unreadCount]
  )

  const handleMarkAsRead = React.useCallback(
    (id: string) =>
      mutate(
        current => {
          const target = current.find(n => n.id === id)
          const wasUnread = target !== undefined && !target.isRead
          return {
            notifications: current.map(n => (n.id === id ? { ...n, isRead: true } : n)),
            unreadCount: Math.max(0, unreadCount - (wasUnread ? 1 : 0))
          }
        },
        () => markAsRead(id),
        'Could not mark that notification as read.'
      ),
    [mutate, unreadCount]
  )

  const handleMarkAllAsRead = React.useCallback(
    () =>
      mutate(
        current => ({ notifications: current.map(n => ({ ...n, isRead: true })), unreadCount: 0 }),
        () => markAllAsRead(),
        'Could not mark your notifications as read.'
      ),
    [mutate]
  )

  const handleClearAll = React.useCallback(() => {
    setConfirmingClear(false)
    return mutate(
      () => ({ notifications: [], unreadCount: 0 }),
      () => clearAllNotifications(),
      'Could not clear your notifications.'
    )
  }, [mutate])

  // Opening one should clear its badge, not leave it unread behind you.
  const handleOpen = React.useCallback(
    (notification: Notification) => {
      if (!notification.actionUrl) return
      handleOpenChange(false)
      if (!notification.isRead) handleMarkAsRead(notification.id)
      // Client navigation: this was a full page reload, which threw away the
      // whole app just to move between two dashboard routes.
      router.push(notification.actionUrl)
    },
    [handleMarkAsRead, handleOpenChange, router]
  )

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        className="relative flex items-center justify-center p-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Bell className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0A0A0A]" />
        )}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={8} align="end">
          <PopoverPrimitive.Popup
            className={cn(
              "z-50 w-[calc(100vw-2rem)] sm:w-96 rounded-xl border border-zinc-200 bg-white shadow-xl outline-none origin-top-right",
              "dark:border-white/10 dark:bg-[#121212]",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/10">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h2>
              <div className="flex gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  confirmingClear ? (
                    // Deleting every notification is not undoable, so it takes a
                    // second, deliberate click rather than one stray one.
                    <span className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">Delete all?</span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingClear(false)}
                        className="font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingClear(true)}
                      className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="max-h-[350px] overflow-y-auto overflow-x-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">No notifications yet</p>
                </div>
              ) : (
                <div className="pb-1">
                  {groups.map(group => {
                    const GroupIcon = group.icon
                    const collapsed = collapsedGroups.has(group.key)
                    return (
                      <section key={group.key}>
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.key)}
                          aria-expanded={!collapsed}
                          // Sticky so the category stays legible while scrolling
                          // a long section. Needs an opaque background or the
                          // rows show through it.
                          className={cn(
                            "sticky top-0 z-10 w-full flex items-center gap-2 px-3 py-2",
                            "bg-white dark:bg-[#121212] border-b border-zinc-100 dark:border-white/5",
                            "text-[11px] font-semibold uppercase tracking-wide",
                            "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
                          )}
                        >
                          <ChevronRight
                            className={cn("h-3 w-3 shrink-0 transition-transform", !collapsed && "rotate-90")}
                          />
                          <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                          <span className="flex-1 text-left truncate">{group.label}</span>
                          <span
                            className={cn(
                              "tabular-nums font-medium",
                              // Colour carries the unread signal so the header
                              // does not need two competing numbers.
                              group.unread > 0
                                ? "text-indigo-600 dark:text-indigo-400"
                                : "text-zinc-400 dark:text-zinc-600"
                            )}
                          >
                            ({group.items.length})
                          </span>
                        </button>

                        {!collapsed && (
                          <div className="flex flex-col gap-1 p-1">
                            {group.items.map(notification => (
                              <NotificationRow
                                key={notification.id}
                                notification={notification}
                                now={now}
                                onOpen={handleOpen}
                                onMarkAsRead={handleMarkAsRead}
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    )
                  })}
                </div>
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
