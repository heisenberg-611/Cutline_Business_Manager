'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'

export function Greeting() {
  const { user, isLoaded } = useUser()
  const firstName = user?.firstName || 'there'
  
  const [greeting, setGreeting] = useState('Welcome')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

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
