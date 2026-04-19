// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockInit = vi.fn()
const mockCaptureException = vi.fn()
const mockSetUser = vi.fn()
const mockBrowserTracingIntegration = vi.fn(() => ({ name: 'BrowserTracing' }))
const mockReplayIntegration = vi.fn(() => ({ name: 'Replay' }))

vi.mock('@sentry/react', () => ({
  init: (...args) => mockInit(...args),
  captureException: (...args) => mockCaptureException(...args),
  setUser: (...args) => mockSetUser(...args),
  browserTracingIntegration: (...args) => mockBrowserTracingIntegration(...args),
  replayIntegration: (...args) => mockReplayIntegration(...args),
}))

describe('sentry init helper', () => {
  beforeEach(() => {
    vi.resetModules()
    mockInit.mockReset()
    mockCaptureException.mockReset()
    mockSetUser.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('initSentry is a no-op when VITE_SENTRY_DSN is missing', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    const { initSentry } = await import('./sentry')
    initSentry()
    expect(mockInit).not.toHaveBeenCalled()
  })

  it('initSentry calls Sentry.init with the DSN when provided', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.us.sentry.io/2')
    const { initSentry } = await import('./sentry')
    initSentry()
    expect(mockInit).toHaveBeenCalledTimes(1)
    expect(mockInit.mock.calls[0][0]).toMatchObject({
      dsn: 'https://abc@o1.ingest.us.sentry.io/2',
    })
  })

  it('initSentry includes browserTracing and replay integrations', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.us.sentry.io/2')
    const { initSentry } = await import('./sentry')
    initSentry()
    const initArgs = mockInit.mock.calls[0][0]
    expect(initArgs.integrations).toBeInstanceOf(Array)
    expect(initArgs.integrations.length).toBeGreaterThanOrEqual(2)
  })

  it('initSentry sets sensible default sample rates', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.us.sentry.io/2')
    const { initSentry } = await import('./sentry')
    initSentry()
    const initArgs = mockInit.mock.calls[0][0]
    expect(initArgs.tracesSampleRate).toBeGreaterThanOrEqual(0)
    expect(initArgs.tracesSampleRate).toBeLessThanOrEqual(1)
    expect(initArgs.replaysSessionSampleRate).toBeGreaterThanOrEqual(0)
    expect(initArgs.replaysSessionSampleRate).toBeLessThanOrEqual(1)
    // On error replays should be 100%
    expect(initArgs.replaysOnErrorSampleRate).toBe(1.0)
  })

  it('initSentry ignores known-benign Supabase auth lock errors', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.us.sentry.io/2')
    const { initSentry } = await import('./sentry')
    initSentry()
    const initArgs = mockInit.mock.calls[0][0]
    expect(initArgs.ignoreErrors).toBeInstanceOf(Array)
    // The specific message Supabase-js throws when another tab steals the lock
    const hasLockFilter = initArgs.ignoreErrors.some((pattern) =>
      (typeof pattern === 'string' && pattern.includes('Lock')) ||
      (pattern instanceof RegExp && pattern.test("Lock 'lock:sb-xxx-auth-token' was released because another request stole it"))
    )
    expect(hasLockFilter).toBe(true)
  })

  it('initSentry is safe to call twice (idempotent)', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.us.sentry.io/2')
    const { initSentry } = await import('./sentry')
    initSentry()
    initSentry()
    expect(mockInit).toHaveBeenCalledTimes(1)
  })

  it('reportError forwards to Sentry.captureException', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.us.sentry.io/2')
    const { reportError } = await import('./sentry')
    const err = new Error('boom')
    reportError(err, { componentStack: 'in App' })
    expect(mockCaptureException).toHaveBeenCalledWith(err, expect.any(Object))
  })

  it('reportError includes componentStack as context when provided', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.us.sentry.io/2')
    const { reportError } = await import('./sentry')
    reportError(new Error('x'), { componentStack: '<App>\n<Routes>' })
    const call = mockCaptureException.mock.calls[0]
    expect(call[1]).toMatchObject({
      contexts: {
        react: { componentStack: '<App>\n<Routes>' },
      },
    })
  })

  it('reportError is a no-op when no DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    const { reportError } = await import('./sentry')
    reportError(new Error('boom'))
    expect(mockCaptureException).not.toHaveBeenCalled()
  })

  it('identifyUser calls Sentry.setUser with the user id and email', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.us.sentry.io/2')
    const { identifyUser } = await import('./sentry')
    identifyUser({ id: 'user-123', email: 'foo@example.com' })
    expect(mockSetUser).toHaveBeenCalledWith({ id: 'user-123', email: 'foo@example.com' })
  })

  it('identifyUser clears the user when passed null', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://abc@o1.ingest.us.sentry.io/2')
    const { identifyUser } = await import('./sentry')
    identifyUser(null)
    expect(mockSetUser).toHaveBeenCalledWith(null)
  })

  it('identifyUser is a no-op when no DSN', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    const { identifyUser } = await import('./sentry')
    identifyUser({ id: 'user-123' })
    expect(mockSetUser).not.toHaveBeenCalled()
  })
})
