'use client'

/**
 * One implementation of the notification chime, shared by the bell and the
 * settings editor. It used to be copy-pasted into both, and the copies drifted:
 * the bell's fork built a fresh AudioContext per notification and never resumed
 * a suspended one, so its sound stopped working after a handful of alerts.
 */

export type NotificationTone = 'chime' | 'beep' | 'bell' | 'bird' | 'raindrop' | 'none'

export interface NotificationPrefs {
  tone: NotificationTone
  dnd: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { tone: 'chime', dnd: false }

// Broadcast within the tab; the `storage` event covers the others.
export const NOTIFICATION_PREFS_EVENT = 'cutline_notification_prefs_changed'

// Scoped per user: the key used to be global, so on a shared browser the next
// person to sign in inherited the previous one's tone and DND state.
export function notificationPrefsKey(userId: string) {
  return `cutline_notification_prefs:${userId}`
}

export function coercePrefs(value: unknown): NotificationPrefs | null {
  if (!value || typeof value !== 'object') return null
  const { tone, dnd } = value as Partial<NotificationPrefs>
  if (typeof tone !== 'string' || typeof dnd !== 'boolean') return null
  return { tone: tone as NotificationTone, dnd }
}

export function writeStoredPrefs(userId: string | null | undefined, prefs: NotificationPrefs) {
  if (!userId || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(notificationPrefsKey(userId), JSON.stringify(prefs))
  } catch {
    // Private mode or a full quota; the server copy is the one that matters.
  }
  window.dispatchEvent(new CustomEvent(NOTIFICATION_PREFS_EVENT, { detail: prefs }))
}

/**
 * Subscribe to preference changes made elsewhere — the settings page in this
 * tab, or either one in another tab. Returns an unsubscribe function.
 */
export function subscribeToPrefs(
  userId: string | null | undefined,
  onChange: (prefs: NotificationPrefs) => void
) {
  if (typeof window === 'undefined') return () => {}

  const handleLocal = (event: Event) => {
    const next = coercePrefs((event as CustomEvent).detail)
    if (next) onChange(next)
  }

  const handleStorage = (event: StorageEvent) => {
    if (!userId || event.key !== notificationPrefsKey(userId) || !event.newValue) return
    try {
      const next = coercePrefs(JSON.parse(event.newValue))
      if (next) onChange(next)
    } catch {
      // Ignore a malformed write from another tab.
    }
  }

  window.addEventListener(NOTIFICATION_PREFS_EVENT, handleLocal)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(NOTIFICATION_PREFS_EVENT, handleLocal)
    window.removeEventListener('storage', handleStorage)
  }
}

// One context for the page, reused. Browsers cap how many a document may hold,
// and each one keeps audio hardware open until it is closed.
let sharedAudioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctor()
  }
  // A context created outside a user gesture starts suspended and stays silent
  // until it is resumed.
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {})
  }
  return sharedAudioContext
}

export function playSound(tone: NotificationTone) {
  if (tone === 'none') return

  try {
    const ctx = getAudioContext()
    if (!ctx) return

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

    if (tone === 'chime') {
      playNote(1046.5, ctx.currentTime)         // C6
      playNote(1318.51, ctx.currentTime + 0.15) // E6
    } else if (tone === 'beep') {
      playNote(880.0, ctx.currentTime, 'sine', 0.2) // A5 short beep
    } else if (tone === 'bell') {
      playNote(1567.98, ctx.currentTime, 'sine', 0.6)     // G6 longer
      playNote(1174.66, ctx.currentTime, 'triangle', 0.6) // D6 mixed
    } else if (tone === 'bird') {
      // High pitched quick sweeps (two chirps)
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
    console.warn('Notification sound failed', e)
  }
}

export function playNotificationFor(prefs: NotificationPrefs) {
  if (prefs.dnd) return
  playSound(prefs.tone)
}
