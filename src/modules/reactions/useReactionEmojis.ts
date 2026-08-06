'use client'

import { useEffect, useState } from 'react'
import { getReactionEmojis } from './actions'

/**
 * The workspace's reaction set, fetched once per surface that shows it.
 *
 * Deliberately not threaded through the message and comment list queries: those
 * are paged and refetched constantly, and the set changes about as often as an
 * admin visits settings. One call when a thread mounts is the cheaper shape.
 *
 * Empty until it resolves, which renders no control rather than the wrong one.
 */
export function useReactionEmojis(): string[] {
  const [emojis, setEmojis] = useState<string[]>([])

  useEffect(() => {
    let active = true
    getReactionEmojis()
      .then((set) => {
        if (active) setEmojis(set)
      })
      .catch(() => {
        // A reaction bar is not worth an error toast; it simply does not appear.
      })
    return () => {
      active = false
    }
  }, [])

  return emojis
}
