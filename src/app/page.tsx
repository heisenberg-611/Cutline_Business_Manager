'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Scissors, ArrowRight, ChevronRight, Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#050505] text-zinc-900 dark:text-zinc-100 flex flex-col relative overflow-hidden selection:bg-indigo-500/30">
      {/* AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/40 dark:bg-indigo-500/20 blur-[100px] dark:blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-300/40 dark:bg-fuchsia-500/20 blur-[100px] dark:blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 md:py-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-2.5"
        >
          <div className="bg-zinc-900 text-white dark:bg-white dark:text-black p-1.5 rounded-lg flex items-center justify-center">
            <Scissors className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-lg tracking-tight text-zinc-900 dark:text-white">Cutline OS</span>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="flex items-center gap-4"
        >
          <Link 
            href="/sign-in" 
            className="inline-flex h-9 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-5 py-1 text-sm font-medium text-zinc-900 dark:text-zinc-100 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900 whitespace-nowrap"
          >
            Log in
          </Link>
          <ThemeToggle />
        </motion.div>
      </header>

      {/* HERO SECTION */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pt-20">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md text-xs font-medium text-zinc-600 dark:text-zinc-300"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>Cutline OS v1.0</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tighter leading-[1.05] text-transparent bg-clip-text bg-gradient-to-b from-zinc-900 to-zinc-500 dark:from-white dark:to-white/60 mb-8 pb-2"
          >
            Creative work,<br />
            perfectly pipelined.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mb-12 font-light leading-relaxed"
          >
            Manage your creative workflows, track project assets, handle client invoicing, and deliver work faster than ever. Built for the modern creative professional.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <Link 
              href="/sign-in"
              className="group relative flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 bg-zinc-900 dark:bg-white font-semibold rounded-full overflow-hidden transition-all hover:scale-[1.02] active:scale-95 shadow-xl hover:shadow-2xl ring-1 ring-zinc-900/5 dark:ring-white/10"
            >
              {/* Professional subtle hover background */}
              <div className="absolute inset-0 bg-zinc-800 dark:bg-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <span className="relative text-white dark:text-zinc-950 transition-colors duration-300 flex items-center gap-2 drop-shadow-sm whitespace-nowrap">
                Sign In to Workspace
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.div>
        </div>
      </main>

      {/* FOOTER */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="py-8 text-center text-xs text-zinc-600 font-medium relative z-10"
      >
        <p>&copy; {new Date().getFullYear()} Cutline OS. All rights reserved.</p>
      </motion.footer>
    </div>
  )
}
