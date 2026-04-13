import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { registerServiceWorker, unregisterServiceWorker, UPDATE_CHECK_INTERVAL_MS } from './serviceWorker'

describe('registerServiceWorker', () => {
  let originalNavigator
  let mockRegister
  let mockGetRegistration
  let mockRegistration
  let onUpdateAvailable

  beforeEach(() => {
    originalNavigator = global.navigator
    onUpdateAvailable = vi.fn()
    mockRegistration = {
      installing: null,
      waiting: null,
      addEventListener: vi.fn(),
      update: vi.fn(),
    }
    mockRegister = vi.fn().mockResolvedValue(mockRegistration)
    mockGetRegistration = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          register: mockRegister,
          getRegistration: mockGetRegistration,
          addEventListener: vi.fn(),
          controller: null,
        },
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it('no-ops when serviceWorker is not in navigator', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    })
    const result = await registerServiceWorker({ onUpdateAvailable })
    expect(result).toBeNull()
  })

  it('registers /sw.js when serviceWorker is available', async () => {
    await registerServiceWorker({ onUpdateAvailable })
    expect(mockRegister).toHaveBeenCalledWith('/sw.js', expect.any(Object))
  })

  it('returns the registration object on success', async () => {
    const result = await registerServiceWorker({ onUpdateAvailable })
    expect(result).toBe(mockRegistration)
  })

  it('returns null and swallows registration errors', async () => {
    mockRegister.mockRejectedValue(new Error('register failed'))
    const result = await registerServiceWorker({ onUpdateAvailable })
    expect(result).toBeNull()
  })

  it('attaches an updatefound listener to the registration', async () => {
    await registerServiceWorker({ onUpdateAvailable })
    expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
      'updatefound',
      expect.any(Function)
    )
  })

  it('calls onUpdateAvailable when a new SW becomes installed while a controller exists', async () => {
    // Simulate: a controller already exists (i.e. not first install)
    global.navigator.serviceWorker.controller = { state: 'activated' }

    // Capture the updatefound handler so we can fire it manually
    let updatefoundHandler
    mockRegistration.addEventListener.mockImplementation((event, cb) => {
      if (event === 'updatefound') updatefoundHandler = cb
    })

    await registerServiceWorker({ onUpdateAvailable })

    // Simulate a new worker entering the 'installing' state
    const installingWorker = {
      state: 'installing',
      addEventListener: vi.fn(),
    }
    mockRegistration.installing = installingWorker
    updatefoundHandler()

    // Capture the statechange handler on the installing worker
    const stateChangeCall = installingWorker.addEventListener.mock.calls.find(
      ([event]) => event === 'statechange'
    )
    expect(stateChangeCall).toBeDefined()
    const stateChangeHandler = stateChangeCall[1]

    // Simulate the worker reaching 'installed'
    installingWorker.state = 'installed'
    stateChangeHandler()

    expect(onUpdateAvailable).toHaveBeenCalled()
  })

  it('does NOT call onUpdateAvailable on first install (no controller yet)', async () => {
    global.navigator.serviceWorker.controller = null

    let updatefoundHandler
    mockRegistration.addEventListener.mockImplementation((event, cb) => {
      if (event === 'updatefound') updatefoundHandler = cb
    })

    await registerServiceWorker({ onUpdateAvailable })

    const installingWorker = {
      state: 'installing',
      addEventListener: vi.fn(),
    }
    mockRegistration.installing = installingWorker
    updatefoundHandler()

    const stateChangeHandler = installingWorker.addEventListener.mock.calls.find(
      ([event]) => event === 'statechange'
    )[1]
    installingWorker.state = 'installed'
    stateChangeHandler()

    // First install — the user shouldn't see "new version available"
    expect(onUpdateAvailable).not.toHaveBeenCalled()
  })

  // v0.10.3 fix: force the browser to check for a new SW on every relevant
  // moment, not just rely on its own lazy heuristics.
  describe('forced update checks', () => {
    it('calls registration.update() immediately after registering', async () => {
      await registerServiceWorker({ onUpdateAvailable })
      expect(mockRegistration.update).toHaveBeenCalled()
    })

    it('calls registration.update() when the tab becomes visible', async () => {
      const addEventListener = vi.fn()
      global.document = {
        addEventListener,
        visibilityState: 'visible',
      }

      await registerServiceWorker({ onUpdateAvailable })
      mockRegistration.update.mockClear()

      // Find the visibilitychange handler and invoke it
      const visibilityCall = addEventListener.mock.calls.find(
        ([event]) => event === 'visibilitychange'
      )
      expect(visibilityCall).toBeDefined()
      const visibilityHandler = visibilityCall[1]
      visibilityHandler()

      expect(mockRegistration.update).toHaveBeenCalled()
    })

    it('does NOT call update() on visibilitychange when tab is hidden', async () => {
      const addEventListener = vi.fn()
      global.document = {
        addEventListener,
        visibilityState: 'visible',
      }

      await registerServiceWorker({ onUpdateAvailable })
      mockRegistration.update.mockClear()

      global.document.visibilityState = 'hidden'
      const visibilityHandler = addEventListener.mock.calls.find(
        ([event]) => event === 'visibilitychange'
      )[1]
      visibilityHandler()

      expect(mockRegistration.update).not.toHaveBeenCalled()
    })

    it('calls registration.update() on a periodic interval', async () => {
      vi.useFakeTimers()
      try {
        await registerServiceWorker({ onUpdateAvailable })
        mockRegistration.update.mockClear()

        vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS)
        expect(mockRegistration.update).toHaveBeenCalledTimes(1)

        vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS)
        expect(mockRegistration.update).toHaveBeenCalledTimes(2)
      } finally {
        vi.useRealTimers()
      }
    })

    it('exports UPDATE_CHECK_INTERVAL_MS as a reasonable interval (30s–120s)', () => {
      expect(UPDATE_CHECK_INTERVAL_MS).toBeGreaterThanOrEqual(30000)
      expect(UPDATE_CHECK_INTERVAL_MS).toBeLessThanOrEqual(120000)
    })

    it('swallows errors from update() so they don\'t crash the app', async () => {
      mockRegistration.update.mockRejectedValue(new Error('update failed'))
      await expect(registerServiceWorker({ onUpdateAvailable })).resolves.toBe(mockRegistration)
    })
  })
})

describe('unregisterServiceWorker', () => {
  it('no-ops when serviceWorker is not in navigator', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    })
    await expect(unregisterServiceWorker()).resolves.toBeUndefined()
  })

  it('calls registration.unregister when a registration exists', async () => {
    const mockUnregister = vi.fn().mockResolvedValue(true)
    Object.defineProperty(global, 'navigator', {
      value: {
        serviceWorker: {
          getRegistration: vi.fn().mockResolvedValue({ unregister: mockUnregister }),
        },
      },
      writable: true,
      configurable: true,
    })
    await unregisterServiceWorker()
    expect(mockUnregister).toHaveBeenCalled()
  })
})
