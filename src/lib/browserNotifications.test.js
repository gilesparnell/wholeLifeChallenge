import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const loadModule = async () => {
  vi.resetModules()
  return await import('./browserNotifications')
}

describe('browserNotifications', () => {
  let originalNotification

  beforeEach(() => {
    originalNotification = globalThis.Notification
  })

  afterEach(() => {
    if (originalNotification === undefined) {
      delete globalThis.Notification
    } else {
      globalThis.Notification = originalNotification
    }
  })

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
})
