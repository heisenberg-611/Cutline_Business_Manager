import React from 'react'
import Link from 'next/link'
import { Scissors } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-zinc-50 dark:bg-[#0A0A0A] selection:bg-indigo-500/30">
      {/* Background aesthetics */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] bg-blue-500/5 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.015] mix-blend-overlay" />
      </div>

      <header className="relative z-10 w-full p-6 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 bg-zinc-900 dark:bg-white rounded-lg shadow-sm transition-transform group-hover:scale-105">
            <Scissors className="w-4 h-4 text-white dark:text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">Cutline</span>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 ease-out">
          {children}
        </div>
      </main>
      
      <footer className="relative z-10 py-6 text-center text-xs text-zinc-500">
        &copy; {new Date().getFullYear()} Cutline. All rights reserved.
      </footer>
    </div>
  )
}
