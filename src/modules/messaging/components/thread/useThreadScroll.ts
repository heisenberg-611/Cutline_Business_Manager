import { useRef, useCallback, useEffect } from 'react'
import { VirtuosoHandle } from 'react-virtuoso'

export function useThreadScroll() {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scrollToBottom = useCallback(() => {
    // The composer calls this before the send resolves, so wait for the
    // optimistic message to be appended to the list.
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      // 'auto', not 'smooth': the list is still settling media heights at this
      // point, and an in-flight smooth scroll gets cancelled and restarted by
      // every re-measure, which is what showed up as jitter.
      virtuosoRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'auto' })
    }, 50)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  return { virtuosoRef, scrollToBottom }
}
