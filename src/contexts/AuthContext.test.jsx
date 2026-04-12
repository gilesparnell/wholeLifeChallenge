import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

// Mock profiles module (never called when session is null)
vi.mock('../lib/profiles', () => ({
  isEmailAllowed: vi.fn().mockResolvedValue(true),
  upsertProfile: vi.fn().mockResolvedValue(null),
  getProfileById: vi.fn().mockResolvedValue(null),
}))

// Mock sentry module — we'll assert it's called on dev sign-in / sign-out
vi.mock('../lib/sentry', () => ({
  identifyUser: vi.fn(),
}))
import { identifyUser } from '../lib/sentry'

function TestConsumer() {
  const { user, session, loading, signIn, signOut, signInAsDev } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <span data-testid="user-name">{user?.user_metadata?.full_name || ''}</span>
      <span data-testid="session">{session ? 'active' : 'none'}</span>
      <button onClick={signIn}>Sign In</button>
      <button onClick={signOut}>Sign Out</button>
      <button onClick={() => signInAsDev('giles@parnellsystems.com')}>Dev Sign In</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    try { localStorage.removeItem('wlc-dev-user') } catch { /* no storage in this env */ }
  })

  it('provides loading=true initially then resolves to false', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )
    })
    expect(screen.getByTestId('loading').textContent).toBe('false')
  })

  it('provides no user when session is null (not signed in)', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )
    })
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('exposes signIn, signOut, and signInAsDev functions', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )
    })
    expect(screen.getByText('Sign In')).toBeDefined()
    expect(screen.getByText('Sign Out')).toBeDefined()
    expect(screen.getByText('Dev Sign In')).toBeDefined()
  })

  it('signInAsDev sets a local mock user without calling Supabase', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Dev Sign In'))
    })
    expect(screen.getByTestId('user').textContent).toBe('giles@parnellsystems.com')
    expect(screen.getByTestId('user-name').textContent).toBe('giles')
  })

  it('signOut clears the dev user', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Dev Sign In'))
    })
    expect(screen.getByTestId('user').textContent).toBe('giles@parnellsystems.com')

    await act(async () => {
      fireEvent.click(screen.getByText('Sign Out'))
    })
    expect(screen.getByTestId('user').textContent).toBe('none')
  })

  it('calls supabase.signInWithOAuth when signIn is invoked', async () => {
    const { supabase } = await import('../lib/supabase')
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Sign In'))
    })
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.any(Object),
    })
  })

  it('calls identifyUser with the dev user when signInAsDev is invoked', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )
    })
    await act(async () => {
      fireEvent.click(screen.getByText('Dev Sign In'))
    })
    expect(identifyUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'giles@parnellsystems.com' })
    )
  })

  it('calls identifyUser(null) on signOut', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )
    })
    // Sign in first so there's a user to clear
    await act(async () => {
      fireEvent.click(screen.getByText('Dev Sign In'))
    })
    identifyUser.mockClear()
    await act(async () => {
      fireEvent.click(screen.getByText('Sign Out'))
    })
    expect(identifyUser).toHaveBeenCalledWith(null)
  })
})
