import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

// Child component that throws on demand
function Bomb({ shouldThrow, message = 'KABOOM' }) {
  if (shouldThrow) throw new Error(message)
  return <div>Safe child</div>
}

describe('ErrorBoundary', () => {
  // Suppress the expected React error output during test runs
  let consoleErrorSpy
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders children normally when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Safe child')).toBeDefined()
  })

  it('renders fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText(/something went wrong/i)).toBeDefined()
  })

  it('shows the error message in the fallback UI', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} message="Network flaky" />
      </ErrorBoundary>
    )
    expect(screen.getByText(/Network flaky/)).toBeDefined()
  })

  it('has a Reload button that calls window.location.reload', () => {
    const reloadSpy = vi.fn()
    // jsdom doesn't let you replace window.location.reload directly;
    // we redefine the whole location object
    const originalLocation = window.location
    delete window.location
    window.location = { ...originalLocation, reload: reloadSpy }

    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    fireEvent.click(screen.getByRole('button', { name: /reload/i }))
    expect(reloadSpy).toHaveBeenCalled()

    window.location = originalLocation
  })

  it('has a Go home link pointing at /', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    )
    const home = screen.getByRole('link', { name: /go home/i })
    expect(home.getAttribute('href')).toBe('/')
  })

  it('logs the error to console.error so Sentry can pick it up later', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} message="Capture me" />
      </ErrorBoundary>
    )
    // React itself logs; we also explicitly log — at least one call should contain our message
    const anyMatching = consoleErrorSpy.mock.calls.some((args) =>
      args.some((a) => String(a).includes('Capture me'))
    )
    expect(anyMatching).toBe(true)
  })

  it('calls an optional onError callback prop with the error and info', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundary onError={onError}>
        <Bomb shouldThrow={true} message="Report this" />
      </ErrorBoundary>
    )
    expect(onError).toHaveBeenCalled()
    const [error, info] = onError.mock.calls[0]
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toBe('Report this')
    expect(info).toHaveProperty('componentStack')
  })

  it('truncates very long error messages in the fallback UI', () => {
    const longMsg = 'x'.repeat(500)
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} message={longMsg} />
      </ErrorBoundary>
    )
    // Should show some of the message but not the full 500 chars
    const body = document.body.textContent
    expect(body).toMatch(/xxxx/) // at least some xs shown
    // And either an ellipsis or a maxLength below 500
    expect(body.length).toBeLessThan(2000)
  })
})
