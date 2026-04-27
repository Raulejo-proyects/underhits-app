const CACHE_NAME = 'underhits-v3'

const STATIC_ASSETS = [
  '/logo.png',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(err => console.warn('SW pre-cache error:', err))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo GET
  if (request.method !== 'GET') return

  // Nunca interceptar: navegación, Next.js internals, APIs externas
  if (request.mode === 'navigate') return
  if (url.pathname.startsWith('/_next/')) return
  if (url.hostname.includes('zeno.fm')) return
  if (url.hostname.includes('supabase.co')) return
  if (url.pathname.startsWith('/api/')) return

  // Cache First solo para assets estáticos conocidos
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
      })
    )
  }
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json()
  self.registration.showNotification(data.title || 'UNDER Hits Radio', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [200, 100, 200],
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow('/radio'))
})
