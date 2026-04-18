// Thin wrapper around the browser Notification API.
// Feature-detected at call time so SSR, older Safari, and unit tests
// (jsdom doesn't ship Notification) all no-op safely.

const DEFAULT_ICON = '/icon-192.svg'

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

export const showNotification = async ({ title, body, tag, icon } = {}) => {
  if (!isNotificationSupported()) return false
  if (getPermission() !== 'granted') return false
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
