// Thin wrapper around the browser Notification API.
// Feature-detected at call time so SSR, older Safari, and unit tests
// (jsdom doesn't ship Notification) all no-op safely.
//
// iOS PWA quirk: `new Notification(...)` from a page context does not
// reliably display on iOS Safari, even on iOS 16.4+ installed PWAs
// where Notification.requestPermission() and Notification.permission
// otherwise behave correctly. Apple's documented path is
// ServiceWorkerRegistration.showNotification(...) which works
// uniformly across desktop Chrome / Safari / Firefox + Android +
// iOS PWA. So when a service worker is registered we route through
// that path; we only fall back to the constructor when no SW is
// available (early dev, unsupported browsers).

const DEFAULT_ICON = '/icon-192.svg'
const SW_READY_TIMEOUT_MS = 2000

export const isNotificationSupported = () => {
  return typeof globalThis !== 'undefined' && typeof globalThis.Notification === 'function'
}

export const getPermission = () => {
  if (!isNotificationSupported()) return 'unsupported'
  const perm = globalThis.Notification.permission
  if (perm === 'granted' || perm === 'denied' || perm === 'default') {
    return perm
  }
  return 'default'
}

export const requestPermission = async () => {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    const result = await globalThis.Notification.requestPermission()
    if (result === 'granted' || result === 'denied' || result === 'default') {
      return result
    }
    return 'denied'
  } catch {
    return 'denied'
  }
}

const showViaServiceWorker = async ({ title, body, tag, icon }) => {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return false
  let registration
  try {
    // Race against a timeout so a missing / hung SW falls back fast.
    registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), SW_READY_TIMEOUT_MS)),
    ])
  } catch {
    return false
  }
  if (!registration || typeof registration.showNotification !== 'function') {
    return false
  }
  try {
    await registration.showNotification(title, {
      body,
      tag,
      icon: icon || DEFAULT_ICON,
      silent: false,
    })
    return true
  } catch {
    return false
  }
}

const showViaConstructor = ({ title, body, tag, icon }) => {
  try {
    // eslint-disable-next-line no-new
    new globalThis.Notification(title, {
      body,
      tag,
      icon: icon || DEFAULT_ICON,
      silent: false,
    })
    return true
  } catch {
    return false
  }
}

export const showNotification = async ({ title, body, tag, icon } = {}) => {
  if (!isNotificationSupported()) return false
  if (getPermission() !== 'granted') return false

  const params = { title, body, tag, icon }

  // Prefer the SW path — required on iOS PWAs and works everywhere else.
  const swOk = await showViaServiceWorker(params)
  if (swOk) return true

  // Fall back to the page-level constructor when no SW is available
  // (or the SW path failed for any reason).
  return showViaConstructor(params)
}
