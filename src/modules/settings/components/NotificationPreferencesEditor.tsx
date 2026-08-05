"use client"

import React, { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Play } from 'lucide-react'
import { updateNotificationPreferences } from '@/modules/settings/actions'
import {
  DEFAULT_NOTIFICATION_PREFS,
  playSound,
  writeStoredPrefs,
  type NotificationPrefs,
  type NotificationTone,
} from '@/modules/notifications/sound'

// Re-exported for the pages that already import these from here.
export type { NotificationPrefs, NotificationTone }
export { playSound }

export function NotificationPreferencesEditor({ initialPreferences }: { initialPreferences?: NotificationPrefs }) {
  const { userId } = useAuth()
  // The saved account value is the starting point; edits below shadow it until
  // the page reloads. Syncing it back in through an effect used to snap the
  // controls to a stale server copy mid-edit.
  const [edited, setEdited] = useState<NotificationPrefs | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const prefs = edited ?? initialPreferences ?? DEFAULT_NOTIFICATION_PREFS

  const savePrefs = async (newPrefs: NotificationPrefs) => {
    const previous = prefs
    setEdited(newPrefs)
    setIsSaving(true)

    try {
      await updateNotificationPreferences(newPrefs)
      // Only publish to the bell once the account row actually has it.
      writeStoredPrefs(userId, newPrefs)
    } catch (e) {
      console.error('Failed to save notification preferences', e)
      // Reporting success for a write that never landed is worse than the
      // failure itself — the switch stayed flipped and nothing was saved.
      setEdited(previous)
      toast.error('Could not save your notification preferences.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Do Not Disturb</label>
          <p className="text-xs text-zinc-500">Mute all notification sounds completely.</p>
        </div>
        <Switch
          checked={prefs.dnd}
          disabled={isSaving}
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
              disabled={prefs.dnd || isSaving}
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
