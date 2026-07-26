"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { AnimatePresence, motion } from "framer-motion"

// Matches AppLayout's SIDEBAR_TRANSITION so the theme row's collapse/expand
// motion lines up with every other sidebar row instead of snapping on its own.
const SIDEBAR_TRANSITION = { duration: 0.3, ease: [0.65, 0, 0.35, 1] as const }
const ICON_SPRING = { type: 'spring' as const, stiffness: 300, damping: 20 }
// See AppLayout's ICON_COLLAPSED_SCALE: collapsed rows get a deliberate,
// animated size bump instead of an instant Tailwind size-class swap.
const ICON_COLLAPSED_SCALE = 1.25

export function ThemeToggle({ isCollapsed, variant = 'sidebar' }: { isCollapsed?: boolean, variant?: 'sidebar' | 'icon' }) {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    if (variant === 'icon') {
      return (
        <button className="p-2 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors flex items-center justify-center">
          <div className="h-5 w-5 shrink-0" />
        </button>
      )
    }
    return (
      <button className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 rounded-md ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="h-4 w-4 shrink-0" />
        {!isCollapsed && <span className="whitespace-nowrap">Theme</span>}
      </button>
    )
  }

  const isDark = resolvedTheme === "dark"

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-full text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-white/5 transition-colors flex items-center justify-center"
        title="Toggle theme"
      >
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {isDark ? (
            <Sun className="h-5 w-5 shrink-0 transition-colors hover:text-indigo-500 dark:hover:text-indigo-400" />
          ) : (
            <Moon className="h-5 w-5 shrink-0 transition-colors hover:text-indigo-500 dark:hover:text-indigo-400" />
          )}
        </motion.div>
      </button>
    )
  }

  return (
    <motion.div initial="initial" whileHover="hover" whileTap="tap">
      <button
        onClick={toggleTheme}
        className="group relative z-0 w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5"
        title={isCollapsed ? 'Toggle theme' : undefined}
      >
        <motion.div
          animate={{ scale: isCollapsed ? ICON_COLLAPSED_SCALE : 1 }}
          transition={SIDEBAR_TRANSITION}
        >
          <motion.div
            variants={{
              initial: { scale: 1 },
              hover: { scale: 1.1 },
              tap: { scale: 0.95 }
            }}
            transition={ICON_SPRING}
          >
            {isDark ? (
              <Sun className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
            ) : (
              <Moon className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
            )}
          </motion.div>
        </motion.div>
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.span
              key="theme-label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={SIDEBAR_TRANSITION}
              className="whitespace-nowrap overflow-hidden"
            >
              {isDark ? "Light Mode" : "Dark Mode"}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.div>
  )
}
