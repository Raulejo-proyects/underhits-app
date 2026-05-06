'use client'
import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const registerSW = async () => {
      try {
        // Desregistrar SWs viejos
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const reg of registrations) {
          const swUrl = reg.active?.scriptURL || ''
          if (!swUrl.includes('/sw.js')) {
            await reg.unregister()
          }
        }

        // Limpiar caches viejos
        const keys = await caches.keys()
        for (const key of keys) {
          if (key !== 'underhits-v4') {
            await caches.delete(key)
          }
        }

        // Registrar nuevo SW
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })

        // Forzar actualización si hay uno nuevo esperando
        if (reg.waiting) {
          reg.waiting.postMessage('skipWaiting')
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newWorker.postMessage('skipWaiting')
              }
            })
          }
        })

      } catch (err) {
        console.error('SW registration failed:', err)
      }
    }

    registerSW()
  }, [])

  return null
}
