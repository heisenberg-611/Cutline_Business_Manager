"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

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
    <button
      onClick={toggleTheme}
      className={`w-full flex items-center px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md transition-colors ${isCollapsed ? 'justify-center' : 'justify-between'}`}
      title={isCollapsed ? 'Toggle theme' : undefined}
    >
      <div className="flex items-center gap-3">
        {isDark ? (
          <Sun className="h-4 w-4 shrink-0 transition-all" />
        ) : (
          <Moon className="h-4 w-4 shrink-0 transition-all" />
        )}
        {!isCollapsed && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
      </div>
    </button>
  )
}
