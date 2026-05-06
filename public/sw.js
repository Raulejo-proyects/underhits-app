const CACHE_NAME = 'underhits-v4'
const STATIC_ASSETS = [
  '/',
  '/radio',
  '/offline',
  '/chat',
  '/registro',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Instalar — cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Cachear cada asset individualmente para no fallar todo si uno falla
      for (const url of STATIC_ASSETS) {
        try {
          await cache.add(new Request(url, { cache: 'reload' }))
        } catch (e) {
          console.warn('SW: no se pudo cachear', url, e)
        }
      }
    })
  )
  self.skipWaiting()
})

// Activar — limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch — estrategia híbrida
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo GET
  if (request.method !== 'GET') return

  // Nunca interceptar: Supabase, Zeno, APIs externas
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('zeno.fm') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('soundcloud.com')
  ) return

  // Next.js internals — network first, sin fallback
  if (url.pathname.startsWith('/_next/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Páginas de la app — Network first con fallback a cache
  if (
    url.pathname === '/' ||
    url.pathname === '/radio' ||
    url.pathname === '/offline' ||
    url.pathname === '/chat' ||
    url.pathname === '/registro' ||
    url.pathname === '/login' ||
    url.pathname.startsWith('/reset-password')
  ) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          // Sin internet — servir desde cache
          return caches.match(request)
            .then(cached => cached || caches.match('/offline'))
        })
    )
    return
  }

  // Assets estáticos — Cache first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2|webp)$/) ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/logo.png' ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        }).catch(() => cached || new Response('', { status: 404 }))
      })
    )
    return
  }

  // Todo lo demás — network con fallback a cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
  )
})

// Mensaje para forzar actualización del SW
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting()
  }
})
