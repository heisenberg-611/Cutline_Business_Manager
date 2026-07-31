"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { AnimatePresence, motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

// Matches AppLayout's label transitions so the theme row's collapse/expand
// motion lines up with every other sidebar row instead of snapping on its own.
// Exit is fast (label disappears instantly rather than visibly squeezing);
// enter is delayed until the rail has room, so text doesn't pop in early.
const LABEL_ENTER_TRANSITION = { duration: 0.2, ease: [0.65, 0, 0.35, 1] as const, delay: 0.1 }
const LABEL_TRANSITION = { duration: 0.15, ease: [0.65, 0, 0.35, 1] as const }
const ICON_SPRING = { type: 'spring' as const, stiffness: 300, damping: 20 }
const HOVER_TAP_VARIANTS = {
  initial: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
}

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
      <button className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium text-muted-foreground rounded-lg">
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
    <Tooltip>
      <TooltipTrigger disabled={!isCollapsed} render={<span className="contents" />}>
        <motion.div initial="initial" whileHover="hover" whileTap="tap">
          <button
            onClick={toggleTheme}
            className="group relative z-0 w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60"
          >
            <motion.div variants={HOVER_TAP_VARIANTS} transition={ICON_SPRING}>
              {isDark ? (
                <Sun className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
              ) : (
                <Moon className="h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 dark:group-hover:text-indigo-400" />
              )}
            </motion.div>
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.span
                  key="theme-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto', transition: LABEL_ENTER_TRANSITION }}
                  exit={{ opacity: 0, width: 0, transition: LABEL_TRANSITION }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {isDark ? "Light Mode" : "Dark Mode"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="right">{isDark ? 'Switch to light mode' : 'Switch to dark mode'}</TooltipContent>
    </Tooltip>
  )
}
