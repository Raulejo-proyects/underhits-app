'use client'

import { useEffect } from 'react'

export function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Unregister all old service workers first, then register fresh
    navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      await Promise.all(registrations.map(r => r.unregister()))

      // Delete all caches except the new one
      const keys = await caches.keys()
      await Promise.all(keys.filter(k => k !== 'underhits-v3').map(k => caches.delete(k)))

      // Register new SW after a short delay to let the page settle
      setTimeout(() => {
        navigator.serviceWorker.register('/sw.js').catch(err =>
          console.warn('SW registration failed:', err)
        )
      }, 1000)
    })
  }, [])

  return null
}
