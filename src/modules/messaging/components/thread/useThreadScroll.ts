import { useRef, useCallback } from 'react'
import { VirtuosoHandle } from 'react-virtuoso'

export function useThreadScroll() {
  const virtuosoRef = useRef<VirtuosoHandle>(null)

  const scrollToBottom = useCallback(() => {
    // Wait for the optimistic update to append the message to the list
    setTimeout(() => {
      virtuosoRef.current?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'smooth' })
    }, 50)
  }, [])

  return { virtuosoRef, scrollToBottom }
}
