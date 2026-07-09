"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"

export function ThemeToggle({ isCollapsed }: { isCollapsed?: boolean }) {
  const { setTheme, theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    return (
      <button className={`w-full flex items-center px-3 py-2 text-sm text-zinc-500 rounded-md ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Theme</span>}
        </div>
      </button>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <motion.div initial="initial" whileHover="hover" whileTap="tap">
      <button
        onClick={toggleTheme}
        className={`group w-full flex items-center px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 dark:hover:text-zinc-100 dark:hover:bg-white/5 rounded-md transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}
        title={isCollapsed ? 'Toggle theme' : undefined}
      >
        <div className="flex items-center gap-3">
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
          {!isCollapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
        </div>
      </button>
    </motion.div>
  )
}
