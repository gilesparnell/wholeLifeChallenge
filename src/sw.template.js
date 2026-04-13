// Service worker template for the WLC PWA.
//
// The BUILD_ID constant below holds a placeholder token (see
// src/lib/substituteBuildId.js for the exact string) that's replaced at
// build time with the current git SHA (or "dev" in development) by the
// wlcServiceWorkerPlugin in vite.config.js. That's essential: if the
// bytes of this file were identical between deploys, the browser would
// never fire `updatefound` and the UpdateToast would never show.
//
// Strategy summary:
//   - HTML / JS / CSS / fonts / icons   → stale-while-revalidate
//   - Supabase / PostHog / Sentry       → bypass (let the network handle)
//   - Anything else                     → bypass (browser decides)
//
// Stale-while-revalidate: serve from cache instantly if available, fetch
// fresh in background and update the cache. `event.waitUntil` is used to
// keep the SW alive until the background fetch + cache update complete,
// so the update actually lands before the worker shuts down.

const BUILD_ID = '__WLC_BUILD_ID__'
const CACHE_NAME = 'wlc-cache-' + BUILD_ID

const isHtmlRequest = (request) => request.mode === 'navigate' || request.destination === 'document'
const isAssetRequest = (request) => {
  const dest = request.destination
  return dest === 'script' || dest === 'style' || dest === 'font' || dest === 'image' || dest === 'manifest'
}
const isSupabaseRequest = (url) => url.hostname.endsWith('.supabase.co') || url.hostname.endsWith('.supabase.in')
const isPosthogRequest = (url) => url.hostname.includes('posthog.com')
const isSentryRequest = (url) => url.hostname.includes('sentry.io')

self.addEventListener('install', (event) => {
  // Activate immediately on install — old version doesn't need to drain.
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Claim all clients so the new SW controls open tabs immediately.
      await self.clients.claim()
      // Drop any old caches from previous build IDs so they don't linger.
      const names = await caches.keys()
      await Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  // Never cache Supabase / PostHog / Sentry — they're either real-time
  // data, analytics ingestion, or error reporting. Caching breaks them.
  if (isSupabaseRequest(url) || isPosthogRequest(url) || isSentryRequest(url)) {
    return
  }

  // Only same-origin HTML / assets go through the cache.
  if (url.origin !== self.location.origin) return
  if (!isHtmlRequest(request) && !isAssetRequest(request)) return

  const fetchPromise = fetch(request)
    .then(async (response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)

  // Keep the SW alive until the network fetch + cache update are done.
  // Without this, the background refresh can be aborted and the cache
  // never gets the new version.
  event.waitUntil(fetchPromise)

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request)
      if (cached) return cached
      const networkResp = await fetchPromise
      if (networkResp) return networkResp
      return new Response('Offline and not cached', {
        status: 503,
        statusText: 'Service Unavailable',
      })
    })()
  )
})
