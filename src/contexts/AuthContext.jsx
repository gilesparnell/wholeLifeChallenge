import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isEmailAllowed, upsertProfile, getProfileById } from '../lib/profiles'

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
  }, [])

  useEffect(() => {
    console.log('[auth] mount')
    // Restore a dev-mode user if one was saved
    const devUser = loadDevUser()
    if (devUser) {
      console.log('[auth] dev user restored:', devUser.email)
      setUser(devUser)
      setProfile({
        id: devUser.id,
        email: devUser.email,
        display_name: devUser.user_metadata?.full_name || devUser.email.split('@')[0],
        role: devUser.email === 'giles@parnellsystems.com' ? 'admin' : 'user',
        status: 'active',
        onboarding_completed: true,
      })
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      try {
        await handleSession(newSession)
      } catch (e) {
        console.error('[auth] onAuthStateChange handleSession threw:', e)
      }
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
  }, [])

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(DEV_USER_STORAGE_KEY)
    } catch {
      // ignore
    }

    if (supabase) {
      await supabase.auth.signOut()
    }
    setSession(null)
    setUser(null)
    setProfile(null)
    setAuthError(null)
  }, [])

  const isAdmin = profile?.role === 'admin' && profile?.status === 'active'

  return (
    <AuthContext.Provider value={{
      session, user, profile, loading, authError,
      signIn, signInAsDev, signOut,
      isAdmin,
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
