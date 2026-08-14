'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { logTime, startTimer, stopTimer, deleteTimeLog } from '../detail-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { format } from 'date-fns'
import { Play, Square, Clock, ListPlus, Activity, Trash2 } from 'lucide-react'

type TimeEntry = {
  id: string
  durationMinutes: number
  isBillable: boolean
  createdAt: Date
  source: string
  notes: string | null
  startedAt: Date | null
  endedAt: Date | null
}

export function TimePanel({ projectId, timeEntries }: { projectId: string, timeEntries: TimeEntry[] }) {
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [timerNotes, setTimerNotes] = useState('')
  const [isManualBillable, setIsManualBillable] = useState(true)
  const [isTimerBillable, setIsTimerBillable] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [elapsedMs, setElapsedMs] = useState(0)

  const activeTimer = timeEntries.find(e => e.source === 'stopwatch' && e.startedAt && !e.endedAt)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (activeTimer && activeTimer.startedAt) {
      const startedAt = new Date(activeTimer.startedAt).getTime()
      setElapsedMs(Date.now() - startedAt)
      
      interval = setInterval(() => {
        setElapsedMs(Date.now() - startedAt)
      }, 1000)
    } else {
      setElapsedMs(0)
    }

    return () => clearInterval(interval)
  }, [activeTimer])

  const totalMinutes = timeEntries.reduce((acc, entry) => acc + entry.durationMinutes, 0)
  const totalHoursDisplay = Math.floor(totalMinutes / 60)
  const totalMinutesDisplay = totalMinutes % 60

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const h = parseInt(hours) || 0
    const m = parseInt(minutes) || 0
    const duration = (h * 60) + m

    if (duration <= 0) return

    startTransition(async () => {
      try {
        await logTime(projectId, duration, isManualBillable, manualNotes)
        setHours('')
        setMinutes('')
        setManualNotes('')
      } catch (error) {
        alert("Failed to log time")
      }
    })
  }

  const handleStartTimer = () => {
    startTransition(async () => {
      try {
        await startTimer(projectId, isTimerBillable)
      } catch (error) {
        alert("Failed to start timer")
      }
    })
  }

  const handleStopTimer = () => {
    if (!activeTimer) return
    
    startTransition(async () => {
      try {
        await stopTimer(activeTimer.id, projectId, timerNotes)
        setTimerNotes('')
      } catch (error) {
        alert("Failed to stop timer")
      }
    })
  }

  const handleDeleteTimeLog = (entryId: string) => {
    if (!confirm('Are you sure you want to delete this time log?')) return
    
    startTransition(async () => {
      try {
        await deleteTimeLog(entryId, projectId)
      } catch (error) {
        alert("Failed to delete time log")
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

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
          <Clock className="w-4 h-4 text-zinc-500" />
          Time Tracking
        </h3>
        <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Total: {totalHoursDisplay}h {totalMinutesDisplay}m
        </div>
      </div>

      <div className="flex-none border-b border-zinc-200 dark:border-zinc-800 p-4 pb-0 bg-zinc-50/50 dark:bg-zinc-900/30">
        <Tabs defaultValue="timer" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="timer" className="gap-2">
              <Activity className="w-4 h-4" /> Timer
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <ListPlus className="w-4 h-4" /> Manual Entry
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="timer" className="pb-4 mt-0 outline-none">
            {activeTimer ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-6 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                    <span className="font-mono text-4xl font-light tracking-tight text-zinc-900 dark:text-zinc-100">
                      {formatElapsed(elapsedMs)}
                    </span>
                  </div>
                  <Button 
                    variant="default" 
                    size="lg" 
                    onClick={handleStopTimer}
                    disabled={isPending}
                    className="w-full max-w-[200px] gap-2 font-bold bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700 dark:text-white"
                  >
                    <Square className="w-4 h-4 fill-current" />
                    Stop Timer
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">What are you working on?</Label>
                  <Input 
                    value={timerNotes}
                    onChange={e => setTimerNotes(e.target.value)}
                    placeholder="Describe your current task..."
                    disabled={isPending}
                    className="bg-white dark:bg-zinc-950"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-solid border-zinc-300 dark:border-zinc-700">
                  <Button 
                    onClick={handleStartTimer} 
                    disabled={isPending} 
                    size="lg"
                    className="w-full max-w-[200px] gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-medium transition-all hover:scale-105 active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Timer
                  </Button>
                </div>
                <div className="flex items-center justify-center pt-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                    <Switch 
                      checked={isTimerBillable} 
                      onCheckedChange={setIsTimerBillable} 
                      disabled={isPending}
                      id="timer-billable"
                    />
                    <Label htmlFor="timer-billable" className="text-sm font-medium cursor-pointer">Billable Session</Label>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="manual" className="pb-4 mt-0 outline-none">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Hours</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    value={hours} 
                    onChange={e => setHours(e.target.value)}
                    disabled={isPending || !!activeTimer}
                    placeholder="0"
                    className="bg-white dark:bg-zinc-950 text-center text-lg font-mono"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Minutes</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    max="59" 
                    value={minutes} 
                    onChange={e => setMinutes(e.target.value)}
                    disabled={isPending || !!activeTimer}
                    placeholder="0"
                    className="bg-white dark:bg-zinc-950 text-center text-lg font-mono"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Notes (Optional)</Label>
                <Input 
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  placeholder="What did you work on?"
                  disabled={isPending || !!activeTimer}
                  className="bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch 
                    checked={isManualBillable} 
                    onCheckedChange={setIsManualBillable} 
                    disabled={isPending || !!activeTimer}
                    id="manual-billable"
                  />
                  <Label htmlFor="manual-billable" className="text-sm font-medium cursor-pointer">Billable</Label>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isPending || !!activeTimer || (!hours && !minutes)} 
                  size="sm" 
                  className="bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {isPending ? 'Logging...' : 'Log Time'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-zinc-900">
        <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          Time Log History
        </h4>
        <div className="space-y-3">
          {timeEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-400 dark:text-zinc-500">
              <Clock className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No time logged yet</p>
            </div>
          ) : (
            timeEntries.map(entry => (
              <div key={entry.id} className="group flex flex-col p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="flex justify-between items-start mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-medium text-sm text-zinc-900 dark:text-zinc-100">
                      {entry.source === 'stopwatch' && !entry.endedAt ? (
                        <span className="flex items-center gap-1.5 text-red-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          Running
                        </span>
                      ) : formatDuration(entry.durationMinutes)}
                    </span>
                    {!entry.isBillable && (
                      <span className="text-[10px] font-medium bg-zinc-200/50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-1.5 py-0.5 rounded-sm">Non-billable</span>
                    )}
                    {entry.source === 'stopwatch' && (
                      <span className="text-[10px] font-medium border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-sm">Timer</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium whitespace-nowrap">
                      {format(new Date(entry.createdAt), 'MMM d')}
                    </span>
                    <button 
                      onClick={() => handleDeleteTimeLog(entry.id)}
                      disabled={isPending || (entry.source === 'stopwatch' && !entry.endedAt)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-all focus:opacity-100 disabled:opacity-0"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {entry.notes && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-snug">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
