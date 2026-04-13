// Service worker for the WLC PWA.
//
// Strategy summary:
//   - HTML / JS / CSS / fonts / icons   → stale-while-revalidate
//   - Supabase API calls                → network-first, no cache
//   - Anything else                     → bypass (let the browser decide)
//
// Stale-while-revalidate: serve from cache instantly if available, fetch
// fresh in background and update the cache for next time. Means the app
// loads instantly on cold start (after first visit) and works offline,
// at the cost of one stale render after a deploy. The UpdateToast
// closes that gap by telling the user to refresh when a new SW takes
// over.
//
// CACHE_NAME is bumped on every deploy via the build-time version. When
// it changes, old caches are nuked in the activate phase.

const CACHE_NAME = 'wlc-cache-v1'

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
      // Drop any old caches that don't match the current version name.
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
    return // bypass — let the network handle it
  }

  // Cache same-origin static assets and HTML with stale-while-revalidate.
  if (url.origin === self.location.origin && (isHtmlRequest(request) || isAssetRequest(request))) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  const networkFetch = fetch(request)
    .then((response) => {
      // Only cache successful, basic (same-origin) responses to avoid
      // poisoning the cache with opaque cross-origin replies.
      if (response && response.status === 200 && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => {})
      }
      return response
    })
    .catch(() => null)

  // Return cached immediately if available, otherwise wait for network.
  return cached || (await networkFetch) || new Response('Offline and not cached', {
    status: 503,
    statusText: 'Service Unavailable',
  })
}
