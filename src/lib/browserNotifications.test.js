import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const loadModule = async () => {
  vi.resetModules()
  return await import('./browserNotifications')
}

describe('browserNotifications', () => {
  let originalNotification
  let originalNavigator

  beforeEach(() => {
    originalNotification = globalThis.Notification
    originalNavigator = globalThis.navigator
  })

  afterEach(() => {
    if (originalNotification === undefined) {
      delete globalThis.Notification
    } else {
      globalThis.Notification = originalNotification
    }
    // Restore the original navigator (jsdom always provides one).
    if (originalNavigator !== undefined) {
      Object.defineProperty(globalThis, 'navigator', {
        value: originalNavigator,
        configurable: true,
        writable: true,
      })
    }
  })

  // Helper: install a fake serviceWorker on navigator with a controlled
  // `ready` promise + a registration that exposes a spyable showNotification.
  const installFakeServiceWorker = ({
    readyResolution = 'registration',
    showNotificationImpl,
  } = {}) => {
    const showSpy = vi.fn(showNotificationImpl ?? (() => Promise.resolve()))
    const registration = { showNotification: showSpy }
    let ready
    if (readyResolution === 'registration') {
      ready = Promise.resolve(registration)
    } else if (readyResolution === 'never') {
      ready = new Promise(() => {})
    } else if (readyResolution === 'no-method') {
      ready = Promise.resolve({})
    } else {
      ready = Promise.resolve(readyResolution)
    }
    const fakeNavigator = {
      serviceWorker: { ready },
    }
    Object.defineProperty(globalThis, 'navigator', {
      value: fakeNavigator,
      configurable: true,
      writable: true,
    })
    return { showSpy, registration }
  }

  describe('when the Notification API is absent', () => {
    it('reports unsupported', async () => {
      delete globalThis.Notification
      const mod = await loadModule()
      expect(mod.isNotificationSupported()).toBe(false)
      expect(mod.getPermission()).toBe('unsupported')
    })

    it('requestPermission resolves to unsupported', async () => {
      delete globalThis.Notification
      const mod = await loadModule()
      await expect(mod.requestPermission()).resolves.toBe('unsupported')
    })

    it('showNotification resolves false and does not throw', async () => {
      delete globalThis.Notification
      const mod = await loadModule()
      await expect(
        mod.showNotification({ title: 't', body: 'b' }),
      ).resolves.toBe(false)
    })
  })

  describe('when the Notification API is present', () => {
    it('reports the current permission', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification

      const mod = await loadModule()
      expect(mod.isNotificationSupported()).toBe(true)
      expect(mod.getPermission()).toBe('granted')
    })

    it('requestPermission delegates to the browser and returns its result', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'default'
      FakeNotification.requestPermission = vi.fn().mockResolvedValue('granted')
      globalThis.Notification = FakeNotification

      const mod = await loadModule()
      await expect(mod.requestPermission()).resolves.toBe('granted')
      expect(FakeNotification.requestPermission).toHaveBeenCalledTimes(1)
    })

    it('requestPermission swallows rejections and resolves denied', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'default'
      FakeNotification.requestPermission = vi
        .fn()
        .mockRejectedValue(new Error('boom'))
      globalThis.Notification = FakeNotification

      const mod = await loadModule()
      await expect(mod.requestPermission()).resolves.toBe('denied')
    })

    it('showNotification does nothing when permission is denied', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'denied'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification

      const mod = await loadModule()
      await expect(
        mod.showNotification({ title: 't', body: 'b' }),
      ).resolves.toBe(false)
      expect(FakeNotification).not.toHaveBeenCalled()
    })

    it('showNotification does nothing when permission is default', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'default'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification

      const mod = await loadModule()
      await expect(
        mod.showNotification({ title: 't', body: 'b' }),
      ).resolves.toBe(false)
      expect(FakeNotification).not.toHaveBeenCalled()
    })

    it('showNotification constructs a Notification when permission is granted', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification

      const mod = await loadModule()
      const ok = await mod.showNotification({
        title: 'Whole Life Challenge',
        body: 'Someone special has just completed 30 min of Running',
        tag: 'wlc-activity-exercise-20260419',
      })
      expect(ok).toBe(true)
      expect(FakeNotification).toHaveBeenCalledTimes(1)
      const [titleArg, optsArg] = FakeNotification.mock.calls[0]
      expect(titleArg).toBe('Whole Life Challenge')
      expect(optsArg).toMatchObject({
        body: 'Someone special has just completed 30 min of Running',
        tag: 'wlc-activity-exercise-20260419',
        icon: '/icon-192.svg',
      })
    })

    it('showNotification swallows constructor errors', async () => {
      const FakeNotification = vi.fn(() => {
        throw new Error('browser refused')
      })
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification

      const mod = await loadModule()
      await expect(
        mod.showNotification({ title: 't', body: 'b' }),
      ).resolves.toBe(false)
    })

    it('allows an override icon', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification

      const mod = await loadModule()
      await mod.showNotification({ title: 't', body: 'b', icon: '/other.png' })
      const [, optsArg] = FakeNotification.mock.calls[0]
      expect(optsArg.icon).toBe('/other.png')
    })
  })

  describe('iOS PWA path: ServiceWorkerRegistration.showNotification', () => {
    it('prefers the SW path over the constructor when both are available', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification
      const { showSpy } = installFakeServiceWorker()

      const mod = await loadModule()
      const ok = await mod.showNotification({
        title: 'Whole Life Challenge',
        body: 'Someone special has just completed 30 min of Running',
        tag: 'wlc-activity-exercise-20260419',
      })
      expect(ok).toBe(true)
      expect(showSpy).toHaveBeenCalledTimes(1)
      // Constructor must NOT be called when the SW path succeeded
      expect(FakeNotification).not.toHaveBeenCalled()
    })

    it('passes title, body, tag, icon, silent through to registration.showNotification', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification
      const { showSpy } = installFakeServiceWorker()

      const mod = await loadModule()
      await mod.showNotification({
        title: 'T',
        body: 'B',
        tag: 'wlc-tag',
        icon: '/icon.png',
      })
      const [titleArg, optsArg] = showSpy.mock.calls[0]
      expect(titleArg).toBe('T')
      expect(optsArg).toMatchObject({
        body: 'B',
        tag: 'wlc-tag',
        icon: '/icon.png',
        silent: false,
      })
    })

    it('defaults the icon when none is provided (SW path)', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification
      const { showSpy } = installFakeServiceWorker()

      const mod = await loadModule()
      await mod.showNotification({ title: 'T', body: 'B' })
      const [, optsArg] = showSpy.mock.calls[0]
      expect(optsArg.icon).toBe('/icon-192.svg')
    })

    it('falls back to the constructor when SW path rejects', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification
      installFakeServiceWorker({
        showNotificationImpl: () => Promise.reject(new Error('sw boom')),
      })

      const mod = await loadModule()
      const ok = await mod.showNotification({ title: 'T', body: 'B' })
      expect(ok).toBe(true)
      expect(FakeNotification).toHaveBeenCalledTimes(1)
    })

    it('falls back to the constructor when navigator.serviceWorker.ready hangs (uses timeout)', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification
      installFakeServiceWorker({ readyResolution: 'never' })

      vi.useFakeTimers()
      const mod = await loadModule()
      const promise = mod.showNotification({ title: 'T', body: 'B' })
      // Advance past the SW ready timeout
      await vi.advanceTimersByTimeAsync(2500)
      const ok = await promise
      vi.useRealTimers()
      expect(ok).toBe(true)
      expect(FakeNotification).toHaveBeenCalledTimes(1)
    })

    it('falls back to the constructor when registration lacks showNotification', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification
      installFakeServiceWorker({ readyResolution: 'no-method' })

      const mod = await loadModule()
      const ok = await mod.showNotification({ title: 'T', body: 'B' })
      expect(ok).toBe(true)
      expect(FakeNotification).toHaveBeenCalledTimes(1)
    })

    it('returns false (no notification) when permission is denied, even with SW available', async () => {
      const FakeNotification = vi.fn()
      FakeNotification.permission = 'denied'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification
      const { showSpy } = installFakeServiceWorker()

      const mod = await loadModule()
      const ok = await mod.showNotification({ title: 'T', body: 'B' })
      expect(ok).toBe(false)
      expect(showSpy).not.toHaveBeenCalled()
      expect(FakeNotification).not.toHaveBeenCalled()
    })

    it('iOS-PWA scenario: constructor missing-ish, SW present → still delivers via SW', async () => {
      // Simulate iOS PWA where new Notification() throws but SW path works.
      const FakeNotification = vi.fn(() => {
        throw new Error('Illegal constructor (iOS Safari page-context)')
      })
      FakeNotification.permission = 'granted'
      FakeNotification.requestPermission = vi.fn()
      globalThis.Notification = FakeNotification
      const { showSpy } = installFakeServiceWorker()

      const mod = await loadModule()
      const ok = await mod.showNotification({ title: 'T', body: 'B' })
      expect(ok).toBe(true)
      expect(showSpy).toHaveBeenCalledTimes(1)
      expect(FakeNotification).not.toHaveBeenCalled()
    })
  })
})
