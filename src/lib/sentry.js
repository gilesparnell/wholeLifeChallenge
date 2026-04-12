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
