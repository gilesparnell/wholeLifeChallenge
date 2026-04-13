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
  const { user, session, loading, sessionExpired, signIn, signOut, signInAsDev } = useAuth()
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <span data-testid="user-name">{user?.user_metadata?.full_name || ''}</span>
      <span data-testid="session">{session ? 'active' : 'none'}</span>
      <span data-testid="session-expired">{String(Boolean(sessionExpired))}</span>
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

  describe('session expiry detection (#18)', () => {
    // Captures the onAuthStateChange callback so tests can fire fake events.
    const setupAndCapture = async () => {
      const { supabase } = await import('../lib/supabase')
      let captured = null
      supabase.auth.onAuthStateChange.mockImplementation((cb) => {
        captured = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })
      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        )
      })
      return { captured, supabase }
    }

    it('initial sessionExpired is false', async () => {
      await act(async () => {
        render(
          <AuthProvider>
            <TestConsumer />
          </AuthProvider>
        )
      })
      expect(screen.getByTestId('session-expired').textContent).toBe('false')
    })

    it('sets sessionExpired=true when SIGNED_OUT fires without a prior user-initiated signOut', async () => {
      const { captured } = await setupAndCapture()
      expect(captured).toBeTypeOf('function')
      await act(async () => {
        captured('SIGNED_OUT', null)
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(screen.getByTestId('session-expired').textContent).toBe('true')
    })

    it('does NOT set sessionExpired when the user calls signOut() and SIGNED_OUT fires', async () => {
      const { captured } = await setupAndCapture()
      await act(async () => {
        fireEvent.click(screen.getByText('Sign Out'))
        await new Promise((r) => setTimeout(r, 20))
      })
      await act(async () => {
        captured('SIGNED_OUT', null)
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(screen.getByTestId('session-expired').textContent).toBe('false')
    })

    it('clears sessionExpired when SIGNED_IN fires after expiry (recovery)', async () => {
      const { captured } = await setupAndCapture()
      await act(async () => {
        captured('SIGNED_OUT', null)
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(screen.getByTestId('session-expired').textContent).toBe('true')
      await act(async () => {
        captured('SIGNED_IN', {
          user: { id: 'u1', email: 'test@example.com', user_metadata: {} },
        })
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(screen.getByTestId('session-expired').textContent).toBe('false')
    })

    it('clears sessionExpired when TOKEN_REFRESHED fires (recovery)', async () => {
      const { captured } = await setupAndCapture()
      await act(async () => {
        captured('SIGNED_OUT', null)
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(screen.getByTestId('session-expired').textContent).toBe('true')
      await act(async () => {
        captured('TOKEN_REFRESHED', {
          user: { id: 'u1', email: 'test@example.com', user_metadata: {} },
        })
        await new Promise((r) => setTimeout(r, 20))
      })
      expect(screen.getByTestId('session-expired').textContent).toBe('false')
    })
  })

  // Regression for the auth-js navigatorLock re-entrancy deadlock
  // (supabase-js issues #1594, #1620, auth-js #762).
  //
  // When the onAuthStateChange callback awaits supabase.from(...) work,
  // auth-js holds the auth lock until the callback's promise resolves.
  // But supabase.from(...) also needs that lock for its request headers,
  // so it waits forever. Every subsequent supabase call in the tab hangs.
  //
  // The only safe shape for an onAuthStateChange callback is to schedule
  // profile work outside the callback's promise chain (setTimeout 0 /
  // queueMicrotask / detached promise) so the lock is released first.
  it('onAuthStateChange callback returns without awaiting handleSession (auth lock safety)', async () => {
    const { supabase } = await import('../lib/supabase')
    const { isEmailAllowed, upsertProfile, getProfileById } = await import('../lib/profiles')

    // Capture the callback auth-js would normally invoke
    let capturedCallback = null
    supabase.auth.onAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    // Simulate the deadlock: isEmailAllowed never resolves, as if it were
    // waiting for the auth lock the callback is holding.
    isEmailAllowed.mockImplementation(() => new Promise(() => {}))
    upsertProfile.mockResolvedValue({ id: 'u1', email: 'test@example.com', status: 'active' })
    getProfileById.mockResolvedValue({ id: 'u1', email: 'test@example.com', status: 'active' })

    await act(async () => {
      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      )
    })

    expect(capturedCallback).toBeTypeOf('function')

    // Fire a SIGNED_IN event. The returned value must resolve quickly —
    // if it awaits handleSession (which awaits isEmailAllowed), auth-js
    // will be stuck holding the lock and the whole app deadlocks.
    const ret = capturedCallback('SIGNED_IN', {
      user: { id: 'u1', email: 'test@example.com', user_metadata: {} },
    })

    const outcome = await Promise.race([
      Promise.resolve(ret).then(() => 'released'),
      new Promise((r) => setTimeout(() => r('stuck'), 50)),
    ])
    expect(outcome).toBe('released')

    // But the work must still be scheduled — handleSession should run in a
    // subsequent task, which means isEmailAllowed gets called eventually.
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    expect(isEmailAllowed).toHaveBeenCalledWith('test@example.com')
  })
})
