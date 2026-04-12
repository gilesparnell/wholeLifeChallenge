import { Component } from 'react'
import { colors, fonts } from '../styles/theme'

const MAX_ERROR_MESSAGE_LENGTH = 240

/**
 * App-wide error boundary. Catches exceptions thrown during rendering
 * anywhere below it and shows a recoverable fallback UI instead of the
 * white screen of death.
 *
 * Usage:
 *   <ErrorBoundary onError={(err, info) => Sentry.captureException(err)}>
 *     <App />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Always log so Sentry (or any other listener) can pick it up
    console.error('[ErrorBoundary] caught:', error, info?.componentStack)
    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, info)
      } catch {
        /* ignore listener failures */
      }
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const rawMessage = error.message || String(error)
    const message = rawMessage.length > MAX_ERROR_MESSAGE_LENGTH
      ? rawMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH) + '\u2026'
      : rawMessage

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 16px',
          background: colors.bg,
          color: colors.text,
          fontFamily: fonts.body,
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 20,
            padding: '32px 28px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>{'\u26A0\uFE0F'}</div>
          <h1
            style={{
              fontFamily: fonts.display,
              fontSize: 22,
              fontWeight: 400,
              marginBottom: 10,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontSize: 13,
              color: colors.textDim,
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            The app hit an unexpected error. Your data is safe — this was a
            rendering issue that we&rsquo;ve logged. Try reloading, or head
            back to the home screen.
          </p>
          <pre
            style={{
              fontSize: 11,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: colors.textFaint,
              background: colors.surfaceHover,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 10,
              padding: '10px 12px',
              margin: '0 0 20px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textAlign: 'left',
              maxHeight: 120,
            }}
          >
            {message}
          </pre>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReload}
              style={{
                background: colors.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: fonts.body,
              }}
            >
              Reload
            </button>
            <a
              href="/"
              style={{
                background: 'transparent',
                color: colors.textDim,
                border: `1px solid ${colors.borderSubtle}`,
                borderRadius: 10,
                padding: '12px 22px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: fonts.body,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    )
  }
}
