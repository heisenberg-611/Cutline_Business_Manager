'use client'

import { useUser } from '@clerk/nextjs'

export function Greeting() {
  const { user, isLoaded } = useUser()
  const firstName = user?.firstName || 'there'
  
  const today = new Date()
  const hour = today.getHours()
  let greeting = 'Good evening'
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 18) greeting = 'Good afternoon'

  if (!isLoaded) {
    return (
      <span className="animate-pulse bg-zinc-200 dark:bg-zinc-800 text-transparent rounded">
        Good morning, loading
      </span>
    )
  }

  return (
    <span>
      {greeting}, {firstName}
    </span>
  )
}
