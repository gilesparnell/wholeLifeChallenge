import * as Sentry from '@sentry/react'

let initialised = false

const getDsn = () => import.meta.env.VITE_SENTRY_DSN || ''
const isProd = () => import.meta.env.PROD === true

/**
 * Initialise Sentry once at app startup. No-op if VITE_SENTRY_DSN is not set.
 * Safe to call multiple times — subsequent calls are ignored.
 */
export const initSentry = () => {
  if (initialised) return
  const dsn = getDsn()
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: isProd() ? 'production' : 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance: 10% of transactions in prod, 100% in dev
    tracesSampleRate: isProd() ? 0.1 : 1.0,
    // Session Replay: 10% of sessions, 100% of sessions where an error occurs
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Strip any query strings from URLs that might contain PII
    sendDefaultPii: false,
    // Filter out known-benign errors so they don't chew through the quota
    ignoreErrors: [
      // Supabase-js navigator.locks mutex "theft" during concurrent token
      // refreshes across tabs. Internal to the SDK, cosmetic, harmless.
      // See: https://github.com/supabase/supabase-js/issues/1400
      /Lock .*auth-token.* was released because another request stole it/,
      // ResizeObserver noise that's expected and handled by the browser
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors the user can't do anything about and we don't
      // want to page on — they're usually the user's wifi, not our bug
      'Network request failed',
      'Failed to fetch',
      'Load failed',
    ],
  })

  initialised = true
}

/**
 * Report an exception to Sentry. Called from the ErrorBoundary and any
 * other place that wants to surface an error.
 */
export const reportError = (error, info) => {
  if (!getDsn()) return
  const context = info?.componentStack
    ? { contexts: { react: { componentStack: info.componentStack } } }
    : {}
  Sentry.captureException(error, context)
}

/**
 * Tag subsequent events with the current user. Call on sign-in and pass
 * null on sign-out.
 */
export const identifyUser = (user) => {
  if (!getDsn()) return
  if (user == null) {
    Sentry.setUser(null)
    return
  }
  Sentry.setUser({
    id: user.id,
    email: user.email,
  })
}
