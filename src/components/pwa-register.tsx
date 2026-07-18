'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/OneSignalSDKWorker.js')
        .catch(err => console.error('Service Worker registration failed:', err))
    }
  }, [])
  return null
}
