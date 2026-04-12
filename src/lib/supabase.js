import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars not set. Running in local-only mode.')
}

// auth-js's default navigator lock uses an infinite timeout and
// deadlocks whenever any callback re-enters supabase.from() while the
// lock is held (supabase-js #1594, #1620, auth-js #762). This is a
// single-tab SPA — we don't need cross-tab auth sync — so we install a
// no-op lock. The root fix is keeping supabase.* calls out of
// onAuthStateChange; this is defence in depth.
const noOpLock = async (_name, _acquireTimeout, fn) => fn()

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: { lock: noOpLock } })
  : null
