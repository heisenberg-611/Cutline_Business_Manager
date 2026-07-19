"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"

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
        className={`group relative z-0 w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5 ${isCollapsed ? 'justify-center' : ''}`}
        title={isCollapsed ? 'Toggle theme' : undefined}
      >
        <motion.div
          variants={{
            initial: { scale: 1 },
            hover: { scale: 1.1 },
            tap: { scale: 0.95 }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {isDark ? (
            <Sun className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
          ) : (
            <Moon className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
          )}
        </motion.div>
        {!isCollapsed && <span className="whitespace-nowrap">{isDark ? "Light Mode" : "Dark Mode"}</span>}
      </button>
    </motion.div>
  )
}
