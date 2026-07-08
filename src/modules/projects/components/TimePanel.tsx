'use client'

import React, { useState, useTransition } from 'react'
import { logTime } from '../detail-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { format } from 'date-fns'

type TimeEntry = {
  id: string
  durationMinutes: number
  isBillable: boolean
  createdAt: Date
}

export function TimePanel({ projectId, timeEntries }: { projectId: string, timeEntries: TimeEntry[] }) {
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [isBillable, setIsBillable] = useState(true)
  const [isPending, startTransition] = useTransition()

  const totalMinutes = timeEntries.reduce((acc, entry) => acc + entry.durationMinutes, 0)
  const totalHoursDisplay = Math.floor(totalMinutes / 60)
  const totalMinutesDisplay = totalMinutes % 60

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const duration = (h * 60) + m

    if (duration <= 0) return

    startTransition(async () => {
      try {
        await logTime(projectId, duration, isBillable)
        setHours('')
        setMinutes('')
      } catch (error) {
        alert("Failed to log time")
      }
    })
  }

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h > 0 && m > 0) return `${h}h ${m}m`
    if (h > 0) return `${h}h`
    return `${m}m`
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex justify-between items-center">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Time Tracking</h3>
        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Total: {totalHoursDisplay}h {totalMinutesDisplay}m
        </div>
      </div>

      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-zinc-500">Hours</Label>
              <Input 
                type="number" 
                min="0" 
                value={hours} 
                onChange={e => setHours(e.target.value)}
                disabled={isPending}
                placeholder="0"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-zinc-500">Minutes</Label>
              <Input 
                type="number" 
                min="0" 
                max="59" 
                value={minutes} 
                onChange={e => setMinutes(e.target.value)}
                disabled={isPending}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch 
                checked={isBillable} 
                onCheckedChange={setIsBillable} 
                disabled={isPending}
                id="billable"
              />
              <Label htmlFor="billable" className="text-sm font-normal">Billable Time</Label>
            </div>
            
            <Button type="submit" disabled={isPending || (!hours && !minutes)} size="sm" className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              {isPending ? 'Logging...' : 'Log Time'}
            </Button>
          </div>
        </form>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Time Log</h4>
        {timeEntries.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-4">No time logged yet.</p>
        ) : (
          timeEntries.map(entry => (
            <div key={entry.id} className="flex justify-between items-center py-2 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  {formatDuration(entry.durationMinutes)}
                </span>
                {!entry.isBillable && (
                  <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">Non-billable</span>
                )}
              </div>
              <span className="text-xs text-zinc-500">
                {format(new Date(entry.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
