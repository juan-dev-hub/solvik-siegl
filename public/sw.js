const CACHE = 'solvik-v1'

const PRECACHE = [
  '/manifest.json',
  '/fonts/Luna-400-latin.woff2',
  '/fonts/Luna-400-latin-ext.woff2',
  '/fonts/Luna-700-latin.woff2',
  '/fonts/Luna-700-latin-ext.woff2',
  '/logo.jpg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Never intercept API routes or cross-origin requests
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  // Fonts and images: cache-first (they're immutable)
  if (
    request.destination === 'font' ||
    request.destination === 'image' ||
    url.pathname.startsWith('/fonts/')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
          return res
        })
      })
    )
    return
  }

  // Next.js static assets: cache-first (content-hashed, immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
          return res
        })
      })
    )
    return
  }

  // Navigation (HTML pages): network-first, cached offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
    )
    return
  }
})
