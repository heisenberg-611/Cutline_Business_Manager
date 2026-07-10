"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { Bell, Check, Loader2, Trash2 } from "lucide-react"
import { getNotifications, markAsRead, markAllAsRead, clearAllNotifications } from "../actions"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

type Notification = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  actionUrl: string | null
  createdAt: Date
}

export function NotificationCenter() {
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const prevTopNotificationId = React.useRef<string | null>(null)
  const isInitialFetch = React.useRef(true)

  const playNotificationSound = React.useCallback(() => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playChime = (freq: number, startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle'; // Clearer tone than sine
        osc.frequency.setValueAtTime(freq, startTime);
        
        // Louder (0.3) and longer fade-out for a clearer ring
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.5);
      }
      
      // Pleasant double ascending chime
      playChime(1046.50, ctx.currentTime);        // C6
      playChime(1318.51, ctx.currentTime + 0.15); // E6
      
    } catch (e) {
      console.log("Audio playback failed or blocked", e);
    }
  }, [])

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
      
      if (isInitialFetch.current) {
        isInitialFetch.current = false
        if (data.length > 0) {
          prevTopNotificationId.current = data[0].id
        }
      } else {
        // Check if there is a new unread notification at the top
        if (data.length > 0 && !data[0].isRead) {
          if (prevTopNotificationId.current !== data[0].id) {
            playNotificationSound()
          }
        }
        if (data.length > 0) {
          prevTopNotificationId.current = data[0].id
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleMarkAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    await markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    await markAllAsRead()
  }

  const handleClearAll = async () => {
    setNotifications([])
    await clearAllNotifications()
  }

  const timeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger className="relative flex items-center justify-center p-2.5 rounded-md hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
        <Bell className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-950" />
        )}
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner sideOffset={8} align="end">
          <PopoverPrimitive.Popup
            className={cn(
              "z-50 w-80 sm:w-96 rounded-xl border border-zinc-200 bg-white shadow-xl outline-none",
              "dark:border-white/10 dark:bg-[#121212]",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-white/10">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Notifications</h2>
              <div className="flex gap-3">
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    Mark all read
                  </button>
                )}
                {notifications.length > 0 && (
                  <button 
                    onClick={handleClearAll}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-[350px] overflow-y-auto overflow-x-hidden p-1">
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
                <div className="flex flex-col gap-1">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={cn(
                        "relative flex gap-3 rounded-lg p-3 text-sm transition-colors cursor-default",
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
                            {timeAgo(notification.createdAt)}
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
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                          className="absolute right-3 top-3 p-1 rounded-full text-indigo-500 opacity-0 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all focus:opacity-100 [.group:hover_&]:opacity-100 group flex-shrink-0"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {!notification.isRead && (
                         <div className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-indigo-500 group-hover:opacity-0 transition-opacity" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
