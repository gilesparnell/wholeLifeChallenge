// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInit = vi.fn()
const mockCapture = vi.fn()
const mockIdentify = vi.fn()
const mockReset = vi.fn()

vi.mock('posthog-js', () => ({
  default: {
    init: (...args) => mockInit(...args),
    capture: (...args) => mockCapture(...args),
    identify: (...args) => mockIdentify(...args),
    reset: (...args) => mockReset(...args),
    __loaded: false,
  },
}))

const importFresh = async () => {
  vi.resetModules()
  return await import('./analytics')
}

beforeEach(() => {
  vi.clearAllMocks()
  // Reset env between tests so we can simulate "no key set"
  vi.stubEnv('VITE_POSTHOG_KEY', '')
  vi.stubEnv('VITE_POSTHOG_HOST', '')
})

describe('initAnalytics', () => {
  it('no-ops when VITE_POSTHOG_KEY is not set', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '')
    const { initAnalytics } = await importFresh()
    initAnalytics()
    expect(mockInit).not.toHaveBeenCalled()
  })

  it('calls posthog.init with key and host when env is set', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://us.i.posthog.com')
    const { initAnalytics } = await importFresh()
    initAnalytics()
    expect(mockInit).toHaveBeenCalledTimes(1)
    expect(mockInit).toHaveBeenCalledWith(
      'phc_test123',
      expect.objectContaining({ api_host: 'https://us.i.posthog.com' })
    )
  })

  it('uses a sane US default host when VITE_POSTHOG_HOST is missing', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    vi.stubEnv('VITE_POSTHOG_HOST', '')
    const { initAnalytics } = await importFresh()
    initAnalytics()
    const opts = mockInit.mock.calls[0][1]
    expect(opts.api_host).toBe('https://us.i.posthog.com')
  })

  it('opts out of autocapture so we control which events get sent', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics } = await importFresh()
    initAnalytics()
    const opts = mockInit.mock.calls[0][1]
    expect(opts.autocapture).toBe(false)
  })

  it('disables session recording (privacy + cost)', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics } = await importFresh()
    initAnalytics()
    const opts = mockInit.mock.calls[0][1]
    expect(opts.disable_session_recording).toBe(true)
  })

  it('does not double-init on a second call', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics } = await importFresh()
    initAnalytics()
    initAnalytics()
    expect(mockInit).toHaveBeenCalledTimes(1)
  })
})

describe('identifyUser', () => {
  it('calls posthog.identify with the user id when init has run', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics, identifyUser } = await importFresh()
    initAnalytics()
    identifyUser({ id: 'user-abc' })
    expect(mockIdentify).toHaveBeenCalledWith('user-abc')
  })

  it('passes only the id — never email, even if provided (PII guard)', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics, identifyUser } = await importFresh()
    initAnalytics()
    identifyUser({ id: 'user-abc', email: 'leak@example.com' })
    // identify is called with the id only, no extra props that could carry email
    const callArgs = mockIdentify.mock.calls[0]
    expect(callArgs[0]).toBe('user-abc')
    // If there's a second arg (props), it must not contain email
    if (callArgs[1]) {
      expect(callArgs[1]).not.toHaveProperty('email')
    }
  })

  it('no-ops when the user has no id', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics, identifyUser } = await importFresh()
    initAnalytics()
    identifyUser({ id: null })
    identifyUser({})
    identifyUser(null)
    expect(mockIdentify).not.toHaveBeenCalled()
  })

  it('no-ops when analytics has not been initialised', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '')
    const { identifyUser } = await importFresh()
    identifyUser({ id: 'user-abc' })
    expect(mockIdentify).not.toHaveBeenCalled()
  })
})

describe('resetUser', () => {
  it('calls posthog.reset', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics, resetUser } = await importFresh()
    initAnalytics()
    resetUser()
    expect(mockReset).toHaveBeenCalled()
  })

  it('no-ops when analytics has not been initialised', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '')
    const { resetUser } = await importFresh()
    resetUser()
    expect(mockReset).not.toHaveBeenCalled()
  })
})

describe('track', () => {
  it('captures an event with no properties', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics, track } = await importFresh()
    initAnalytics()
    track('checkin_saved')
    expect(mockCapture).toHaveBeenCalledWith('checkin_saved', {})
  })

  it('captures an event with properties', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics, track } = await importFresh()
    initAnalytics()
    track('habit_completed', { habit: 'sleep', duration_min: 480 })
    expect(mockCapture).toHaveBeenCalledWith('habit_completed', {
      habit: 'sleep',
      duration_min: 480,
    })
  })

  it('strips PII keys from properties (email, *_text, display_name, name)', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics, track } = await importFresh()
    initAnalytics()
    track('reflection_added', {
      habit: 'reflect',
      email: 'leak@example.com',
      reflection_text: 'a private thought',
      activity_text: 'walked the dog',
      display_name: 'Giles',
      name: 'Giles',
      length_chars: 42, // safe — keep
    })
    const props = mockCapture.mock.calls[0][1]
    expect(props.habit).toBe('reflect')
    expect(props.length_chars).toBe(42)
    expect(props).not.toHaveProperty('email')
    expect(props).not.toHaveProperty('reflection_text')
    expect(props).not.toHaveProperty('activity_text')
    expect(props).not.toHaveProperty('display_name')
    expect(props).not.toHaveProperty('name')
  })

  it('no-ops when analytics has not been initialised', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', '')
    const { track } = await importFresh()
    track('checkin_saved', { habit: 'sleep' })
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('handles undefined properties without throwing', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test123')
    const { initAnalytics, track } = await importFresh()
    initAnalytics()
    expect(() => track('event', undefined)).not.toThrow()
    expect(mockCapture).toHaveBeenCalledWith('event', {})
  })
})
