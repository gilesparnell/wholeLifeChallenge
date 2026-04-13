// Thin wrapper around navigator.serviceWorker registration.
//
// Why hand-rolled instead of vite-plugin-pwa: the plugin is currently 1
// vite major version behind (only supports Vite 7) and pulls in workbox
// transitive deps with active CVEs. For a 4-user app a 30-line SW with a
// stale-while-revalidate strategy gives us 95% of the value with zero
// extra deps. If the plugin catches up, we can swap implementations
// behind this same module boundary without touching call sites.
//
// On a NEW install (first time the user visits with the SW available):
// we silently install — no toast, the user has nothing to update from.
//
// On an UPDATE (user already had a SW running, deploy ships new code):
// we fire onUpdateAvailable so the UI can show a "Refresh for new
// version" toast.

export async function registerServiceWorker({ onUpdateAvailable } = {}) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })

    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing
      if (!installingWorker) return

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          // If a controller already exists, this is an UPDATE — surface it.
          // If not, this is the FIRST install on this browser — don't nag.
          if (navigator.serviceWorker.controller) {
            if (typeof onUpdateAvailable === 'function') {
              onUpdateAvailable(registration)
            }
          }
        }
      })
    })

    return registration
  } catch {
    // Don't blow up the app if SW registration fails — it's a progressive
    // enhancement, not a hard requirement.
    return null
  }
}

export async function unregisterServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.unregister()
    }
  } catch {
    // Same as above — silent on failure.
  }
}
