"use client"

import React, { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import { updateNotificationPreferences } from '@/modules/settings/actions'

export type NotificationTone = 'chime' | 'beep' | 'bell' | 'bird' | 'raindrop' | 'none'

export interface NotificationPrefs {
  tone: NotificationTone
  dnd: boolean
}

export function playSound(tone: NotificationTone) {
  if (tone === 'none') return

  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    
    const playNote = (freq: number, startTime: number, type: OscillatorType = 'triangle', duration = 0.4) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.type = type
      osc.frequency.setValueAtTime(freq, startTime)
      
      gain.gain.setValueAtTime(0.3, startTime)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      osc.start(startTime)
      osc.stop(startTime + duration + 0.1)
    }
    
    if (tone === 'chime') {
      playNote(1046.50, ctx.currentTime)        // C6
      playNote(1318.51, ctx.currentTime + 0.15) // E6
    } else if (tone === 'beep') {
      playNote(880.00, ctx.currentTime, 'sine', 0.2) // A5 short beep
    } else if (tone === 'bell') {
      playNote(1567.98, ctx.currentTime, 'sine', 0.6) // G6 longer
      playNote(1174.66, ctx.currentTime, 'triangle', 0.6) // D6 mixed
    } else if (tone === 'bird') {
      // High pitched quick sweeps (two chirps)
      const playChirp = (startFreq: number, endFreq: number, timeOff: number) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(startFreq, ctx.currentTime + timeOff)
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + timeOff + 0.1)
        gain.gain.setValueAtTime(0.2, ctx.currentTime + timeOff)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + timeOff + 0.15)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + timeOff)
        osc.stop(ctx.currentTime + timeOff + 0.2)
      }
      playChirp(2000, 3000, 0)
      playChirp(2200, 3200, 0.15)
    } else if (tone === 'raindrop') {
      // Quick high to low freq drop
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    }
  } catch (e) {
    console.log("Audio playback failed", e)
  }
}

export function NotificationPreferencesEditor({ initialPreferences }: { initialPreferences?: NotificationPrefs }) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPreferences || { tone: 'chime', dnd: false })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (initialPreferences) {
      setPrefs(initialPreferences)
      localStorage.setItem('cutline_notification_prefs', JSON.stringify(initialPreferences))
    } else {
      const stored = localStorage.getItem('cutline_notification_prefs')
      if (stored) {
        try {
          setPrefs(JSON.parse(stored))
        } catch (e) {}
      }
    }
    setMounted(true)
  }, [initialPreferences])

  const savePrefs = async (newPrefs: NotificationPrefs) => {
    setPrefs(newPrefs)
    localStorage.setItem('cutline_notification_prefs', JSON.stringify(newPrefs))
    // Dispatch a custom event so the NotificationCenter can immediately pick it up if needed
    window.dispatchEvent(new Event('cutline_notification_prefs_changed'))
    
    try {
      await updateNotificationPreferences(newPrefs)
    } catch (e) {
      console.error("Failed to sync notification preferences", e)
    }
  }

  if (!mounted) return <div className="h-24 animate-pulse bg-zinc-100 dark:bg-zinc-900 rounded-md" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Do Not Disturb</label>
          <p className="text-xs text-zinc-500">Mute all notification sounds completely.</p>
        </div>
        <Switch 
          checked={prefs.dnd} 
          onCheckedChange={(checked) => savePrefs({ ...prefs, dnd: checked })} 
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Notification Tone</label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select 
              value={prefs.tone} 
              onValueChange={(val) => { if (val) savePrefs({ ...prefs, tone: val as NotificationTone }) }}
              disabled={prefs.dnd}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chime">Chime (Default)</SelectItem>
                <SelectItem value="beep">Soft Beep</SelectItem>
                <SelectItem value="bell">Crystal Bell</SelectItem>
                <SelectItem value="bird">Morning Bird</SelectItem>
                <SelectItem value="raindrop">Raindrop</SelectItem>
                <SelectItem value="none">None (Silent)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            disabled={prefs.dnd || prefs.tone === 'none'}
            onClick={() => playSound(prefs.tone)}
            title="Test Sound"
          >
            <Play className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
