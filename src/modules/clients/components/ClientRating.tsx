'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { updateClientRating } from '../actions'

export function ClientRating({ clientId, initialRating }: { clientId: string; initialRating: number | null }) {
  const [rating, setRating] = useState(initialRating || 3)
  const [isHovering, setIsHovering] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)
  const [isPending, startTransition] = useTransition()

  const handleRatingClick = (newRating: number) => {
    setRating(newRating)
    startTransition(async () => {
      try {
        await updateClientRating(clientId, newRating)
      } catch (err) {
        console.error('Failed to update rating', err)
        // Revert on error
        setRating(rating)
      }
    })
  }

  return (
    <div
      className="flex items-center gap-1 cursor-pointer"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false)
        setHoverRating(0)
      }}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          onClick={() => handleRatingClick(i + 1)}
          onMouseEnter={() => setHoverRating(i + 1)}
          disabled={isPending}
          className="transition-all disabled:opacity-50"
          title={`${i + 1} star${i + 1 !== 1 ? 's' : ''}`}
        >
          <Star
            className={`w-4 h-4 transition-colors ${
              i < (isHovering ? hoverRating : rating)
                ? 'fill-amber-500 text-amber-500'
                : 'text-zinc-300 dark:text-zinc-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}
