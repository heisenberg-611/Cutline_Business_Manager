'use client'

import React, { useState, useTransition } from 'react'
import { WORKFLOW_PRESETS, WorkflowPreset } from '../config/presets'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react'
import { applyWorkflowPreset, restoreDefaults } from '../actions'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function WorkflowPresetSelector() {
  const [selectedPreset, setSelectedPreset] = useState<WorkflowPreset | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleApply = () => {
    if (!selectedPreset) return
    startTransition(async () => {
      try {
        await applyWorkflowPreset(selectedPreset.id)
        setSelectedPreset(null)
        router.refresh()
      } catch (err) {
        console.error(err)
      }
    })
  }

  const handleRestore = () => {
    setIsResetting(true)
    startTransition(async () => {
      try {
        await restoreDefaults()
        setShowResetDialog(false)
        router.refresh()
      } catch (err) {
        console.error(err)
      } finally {
        setIsResetting(false)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="sm:hidden">
        <Button 
          variant="outline" 
          className="w-full justify-between bg-white dark:bg-zinc-950"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        >
          {isMobileExpanded ? 'Hide Workflow Presets' : 'View Workflow Presets'}
          {isMobileExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
        </Button>
      </div>

      <div className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        !isMobileExpanded && "hidden sm:grid"
      )}>
        {WORKFLOW_PRESETS.map((preset) => (
          <motion.div
            key={preset.id}
            initial={{ y: 0, boxShadow: "0px 0px 0px rgba(0,0,0,0)" }}
            whileHover={{ 
              y: -4, 
              boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.1), 0 8px 10px -6px rgba(79, 70, 229, 0.1)" 
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex flex-col p-5 bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-white/5 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-colors cursor-pointer group relative overflow-hidden"
            onClick={() => setSelectedPreset(preset)}
          >
            {/* Subtle top gradient accent that fades in on hover */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300">{preset.icon}</span>
              <h5 className="font-medium text-sm text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors duration-300 tracking-tight">{preset.name}</h5>
            </div>
            
            <p className="text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400 flex-grow mb-5 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors duration-300">
              {preset.description}
            </p>
            
            <div className="mt-auto">
              <div className="text-[10px] uppercase font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 mb-2">Stages</div>
              <div className="flex flex-wrap gap-1.5">
                {preset.pipelineStages.slice(0, 3).map((stage, i) => (
                  <span key={i} className="text-[10px] font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-md text-zinc-600 dark:text-zinc-400 border border-transparent group-hover:border-indigo-100 dark:group-hover:border-indigo-900/50 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-900/20 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-all duration-300">
                    {stage.name}
                  </span>
                ))}
                {preset.pipelineStages.length > 3 && (
                  <span className="text-[10px] font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-900/50 rounded-md text-zinc-500 dark:text-zinc-500 transition-all duration-300">
                    +{preset.pipelineStages.length - 3}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowResetDialog(true)}
          className="text-zinc-500 hover:text-red-600 dark:hover:text-red-400 text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-2" />
          Restore Default Settings
        </Button>
      </div>

      <Dialog open={!!selectedPreset} onOpenChange={(open) => !open && setSelectedPreset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply {selectedPreset?.name} Preset?</DialogTitle>
            <DialogDescription>
              This will completely replace your current pipeline stages with:
            </DialogDescription>
            <div className="pt-2 space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedPreset?.pipelineStages.map((stage, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-white/10">
                    {stage.name}
                  </span>
                ))}
              </div>
              <p className="text-amber-600 dark:text-amber-500 font-medium text-sm mt-2">
                ⚠️ Warning: All existing projects will be automatically moved to the first stage ("{selectedPreset?.pipelineStages[0].name}") to prevent data loss.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPreset(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Preset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Default Settings?</DialogTitle>
            <DialogDescription>
              This will reset your navigation sidebar and pipeline stages back to the standard creative workflow.
            </DialogDescription>
            <div className="pt-2">
              <p className="text-amber-600 dark:text-amber-500 font-medium text-sm mt-2">
                ⚠️ Warning: All existing projects will be automatically moved to the first default stage to prevent data loss.
              </p>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)} disabled={isResetting || isPending}>
              Cancel
            </Button>
            <Button onClick={handleRestore} disabled={isResetting || isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {(isResetting || isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Restore Defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
