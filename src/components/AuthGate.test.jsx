import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// We'll test AuthGate with different auth states
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../contexts/AuthContext'
import AuthGate from './AuthGate'

describe('AuthGate', () => {
  it('shows loading state when auth is loading', () => {
    useAuth.mockReturnValue({ loading: true, user: null, session: null, signIn: vi.fn() })
    render(<AuthGate><div>Protected</div></AuthGate>)
    expect(screen.getByText('Loading...')).toBeDefined()
    expect(screen.queryByText('Protected')).toBeNull()
  })

  it('shows sign-in screen when user is not authenticated', () => {
    useAuth.mockReturnValue({ loading: false, user: null, session: null, signIn: vi.fn() })
    render(<AuthGate><div>Protected</div></AuthGate>)
    expect(screen.getByText(/Sign in with Google/i)).toBeDefined()
    expect(screen.queryByText('Protected')).toBeNull()
  })

  it('renders children when user is authenticated', () => {
    useAuth.mockReturnValue({
      loading: false,
      user: { email: 'test@example.com' },
      session: { access_token: 'token' },
      signIn: vi.fn(),
      signInAsDev: vi.fn(),
    })
    render(<AuthGate><div>Protected</div></AuthGate>)
    expect(screen.getByText('Protected')).toBeDefined()
  })

  it('shows Dev Login button in dev mode', () => {
    useAuth.mockReturnValue({
      loading: false, user: null, session: null,
      signIn: vi.fn(),
      signInAsDev: vi.fn(),
    })
    render(<AuthGate><div>Protected</div></AuthGate>)
    // import.meta.env.DEV is true in vitest by default
    expect(screen.getByText('Dev Login')).toBeDefined()
  })

  it('calls signInAsDev with the entered email when Dev Login is clicked', async () => {
    const signInAsDev = vi.fn()
    useAuth.mockReturnValue({
      loading: false, user: null, session: null,
      signIn: vi.fn(),
      signInAsDev,
    })
    const { fireEvent } = await import('@testing-library/react')
    render(<AuthGate><div>Protected</div></AuthGate>)
    fireEvent.click(screen.getByText('Dev Login'))
    expect(signInAsDev).toHaveBeenCalledWith('giles@parnellsystems.com')
  })
})
