"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { usePathname } from "next/navigation"

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
      return;
    }
    orig.apply(console, args);
  };
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/hq');
  
  return (
    <NextThemesProvider 
      {...props} 
      key={isAdmin ? "admin" : "user"}
      storageKey={isAdmin ? "admin-theme" : "theme"}
    >
      {children}
    </NextThemesProvider>
  )
}
