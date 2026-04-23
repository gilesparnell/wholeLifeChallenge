import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { isEmailAllowed, upsertProfile, getProfileById } from '../lib/profiles'
import { identifyUser } from '../lib/sentry'
import {
  identifyUser as identifyAnalyticsUser,
  resetUser as resetAnalyticsUser,
  track as trackAnalytics,
} from '../lib/analytics'

const AuthContext = createContext(null)

const DEV_USER_STORAGE_KEY = 'wlc-dev-user'

// Restore a dev user across reloads (dev only).
function loadDevUser() {
  try {
    const stored = localStorage.getItem(DEV_USER_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored)
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Distinguishes a user-clicked sign-out from an involuntary SIGNED_OUT
  // event (token refresh failure, server-side revocation). Set true just
  // before we call supabase.auth.signOut() so the auth-state listener can
  // skip showing the "session expired" banner when the user asked to leave.
  const userInitiatedSignOutRef = useRef(false)

  // Handle a fresh Supabase session: check whitelist, upsert profile.
  const handleSession = useCallback(async (newSession) => {
    if (!newSession?.user) {
      setUser(null)
      setSession(null)
      setProfile(null)
      return
    }

    const authUser = newSession.user
    const email = authUser.email

    const allowed = await isEmailAllowed(email)
    if (!allowed) {
      setAuthError('Access denied. Your email is not on the approved list.')
      if (supabase) await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
      return
    }

    const upserted = await upsertProfile({
      id: authUser.id,
      email,
      displayName: authUser.user_metadata?.full_name || email.split('@')[0],
      avatarUrl: authUser.user_metadata?.avatar_url || null,
    })

    const fullProfile = upserted || (await getProfileById(authUser.id))

    if (fullProfile?.status === 'inactive') {
      setAuthError('Your account has been deactivated.')
      if (supabase) await supabase.auth.signOut()
      setUser(null)
      setSession(null)
      setProfile(null)
      return
    }

    setAuthError(null)
    setSession(newSession)
    setUser(authUser)
    setProfile(fullProfile)
    identifyUser({ id: authUser.id, email: authUser.email })
    identifyAnalyticsUser({ id: authUser.id })
    trackAnalytics('signed_in', { provider: 'google' })
  }, [])

  useEffect(() => {
    console.log('[auth] mount')
    // Restore a dev-mode user if one was saved
    const devUser = loadDevUser()
    if (devUser) {
      setUser(devUser)
      setProfile({
        id: devUser.id,
        email: devUser.email,
        display_name: devUser.user_metadata?.full_name || devUser.email.split('@')[0],
        role: devUser.email === 'giles@parnellsystems.com' ? 'admin' : 'user',
        status: 'active',
        onboarding_completed: true,
      })
      identifyUser({ id: devUser.id, email: devUser.email })
      setLoading(false)
      return
    }

    if (!supabase) {
      console.warn('[auth] no supabase client')
      setLoading(false)
      return
    }

    // Safety net: if getSession hangs more than 6s, assume signed-out so the
    // app at least loads the login screen instead of being stuck on Loading.
    let resolved = false
    const safetyTimer = setTimeout(() => {
      if (!resolved) {
        console.warn('[auth] getSession timed out — clearing stale state')
        try {
          // Clear any stored Supabase session that might be jamming the SDK
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith('sb-') && k.includes('-auth-token')) {
              localStorage.removeItem(k)
            }
          })
        } catch { /* ignore */ }
        setLoading(false)
      }
    }, 6000)

    console.log('[auth] calling getSession')
    supabase.auth.getSession()
      .then(async ({ data: { session: initialSession } }) => {
        resolved = true
        clearTimeout(safetyTimer)
        console.log('[auth] getSession resolved:', !!initialSession)
        try {
          await handleSession(initialSession)
        } catch (e) {
          console.error('[auth] handleSession threw:', e)
        } finally {
          setLoading(false)
        }
      })
      .catch((e) => {
        resolved = true
        clearTimeout(safetyTimer)
        console.error('[auth] getSession rejected:', e)
        setLoading(false)
      })

    // IMPORTANT: must not `await` supabase.* work inside this callback.
    // auth-js holds the navigator lock for the key `lock:sb-*-auth-token`
    // for the lifetime of the returned promise, and PostgREST queries
    // (`supabase.from(...)`) also need that lock for their auth headers —
    // awaiting them here causes a re-entrant deadlock that hangs every
    // subsequent supabase call in the tab (supabase-js #1594, #1620,
    // auth-js #762). Defer handleSession to a fresh task so the lock is
    // released before any query runs.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'SIGNED_OUT') {
        if (userInitiatedSignOutRef.current) {
          userInitiatedSignOutRef.current = false
        } else {
          // Involuntary sign-out — token refresh failed or session was
          // revoked server-side. Surface this so AuthGate can tell the
          // user why they're back on the login screen.
          setSessionExpired(true)
        }
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSessionExpired(false)
      }
      setTimeout(() => {
        handleSession(newSession).catch((e) => {
          console.error('[auth] onAuthStateChange handleSession threw:', e)
        })
      }, 0)
    })

    return () => {
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [handleSession])

  const signIn = useCallback(async () => {
    if (!supabase) return
    setAuthError(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        // Force Google to always show its account-chooser, even when the
        // user already has an active Google session in this browser.
        // Without this, sign-out → sign-in silently re-uses the previous
        // Google account, making it impossible to switch between accounts
        // on the same device.
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
  }, [])

  const signInAsDev = useCallback((email) => {
    const devUser = {
      id: `dev-${email}`,
      email,
      user_metadata: {
        full_name: email.split('@')[0],
        avatar_url: null,
      },
      app_metadata: { provider: 'dev' },
    }
    try {
      localStorage.setItem(DEV_USER_STORAGE_KEY, JSON.stringify(devUser))
    } catch {
      // ignore
    }
    setUser(devUser)
    setProfile({
      id: devUser.id,
      email,
      display_name: email.split('@')[0],
      role: email === 'giles@parnellsystems.com' ? 'admin' : 'user',
      status: 'active',
    })
    setSession(null)
    setAuthError(null)
    identifyUser({ id: devUser.id, email })
    identifyAnalyticsUser({ id: devUser.id })
    trackAnalytics('signed_in', { provider: 'dev' })
  }, [])

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(DEV_USER_STORAGE_KEY)
    } catch {
      // ignore
    }

    if (supabase) {
      // Mark this as user-initiated so the SIGNED_OUT listener doesn't
      // misread it as an expired session.
      userInitiatedSignOutRef.current = true
      await supabase.auth.signOut()
    }
    setSession(null)
    setUser(null)
    setProfile(null)
    setAuthError(null)
    setSessionExpired(false)
    identifyUser(null)
    trackAnalytics('signed_out')
    resetAnalyticsUser()
  }, [])

  const isAdmin = profile?.role === 'admin' && profile?.status === 'active'

  // Shallow-merge patch into the in-memory profile. Used by My Preferences
  // after a successful remote update, and by dev mode where there's no DB.
  const updateLocalProfile = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return
    setProfile((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading, authError, sessionExpired,
      signIn, signInAsDev, signOut,
      isAdmin,
      updateLocalProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
