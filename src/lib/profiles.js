import { supabase } from './supabase'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const normaliseEmail = (email) => (email || '').trim().toLowerCase()

/**
 * Check if an email address is on the allowed_emails whitelist.
 * Returns false on any error or missing input.
 */
export const isEmailAllowed = async (email) => {
  if (!email) return false
  if (!supabase) return false

  const normalised = normaliseEmail(email)
  // Use ilike for case-insensitive match against allowed_emails.email
  const { data, error } = await supabase
    .from('allowed_emails')
    .select('email')
    .ilike('email', normalised)
    .maybeSingle()

  if (error) return false
  return !!data
}

/**
 * Insert or update a profile row on sign-in.
 *
 * On FIRST sign-in (no existing row), inserts the full profile including
 * a display_name derived from the Google OAuth payload (or email local-part).
 *
 * On returning sign-ins, ONLY refreshes last_login_at / avatar_url / email —
 * we never touch display_name because the admin or the user themselves may
 * have edited it via My Preferences or the Admin page, and the Google OAuth
 * "full_name" field would silently overwrite those edits on every login.
 */
export const upsertProfile = async ({ id, email, displayName, avatarUrl }) => {
  if (!supabase || !id || !email) return null

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        email: normaliseEmail(email),
        avatar_url: avatarUrl ?? null,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()
    if (error) return null
    return data
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id,
      email: normaliseEmail(email),
      display_name: displayName || email.split('@')[0],
      avatar_url: avatarUrl ?? null,
      last_login_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) return null
  return data
}

export const getProfileByEmail = async (email) => {
  if (!supabase || !email) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', normaliseEmail(email))
    .maybeSingle()

  if (error) return null
  return data
}

export const getProfileById = async (id) => {
  if (!supabase || !id) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return null
  return data
}

export const listProfiles = async () => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data
}

export const listAllowedEmails = async () => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('allowed_emails')
    .select('*')
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data
}

export const addAllowedEmail = async (email, addedBy) => {
  if (!supabase) return null
  const normalised = normaliseEmail(email)
  if (!EMAIL_RE.test(normalised)) return null

  const { data, error } = await supabase
    .from('allowed_emails')
    .insert({ email: normalised, added_by: addedBy ?? null })
    .select()
    .single()

  if (error) return null
  return data
}

export const removeAllowedEmail = async (id) => {
  if (!supabase || !id) return null

  const { error } = await supabase
    .from('allowed_emails')
    .delete()
    .eq('id', id)

  return !error
}

export const updateProfile = async (id, patch) => {
  if (!supabase || !id || !patch) return null

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return null
  return data
}

export const deleteProfile = async (id) => {
  if (!supabase || !id) return null

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id)

  return !error
}

/**
 * Update a user's denormalised stats on their profile row.
 * These drive the public leaderboard view.
 */
export const updateProfileStats = async (id, { totalScore, currentStreak, daysActive, cumulativeByDay }) => {
  if (!supabase || !id) return null

  const patch = {
    total_score: totalScore,
    current_streak: currentStreak,
    days_active: daysActive,
  }
  if (cumulativeByDay !== undefined) {
    patch.cumulative_by_day = cumulativeByDay
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return null
  return data
}

/**
 * Mark a user's onboarding as complete so the onboarding modal stops showing.
 */
export const markOnboardingComplete = async (id) => {
  if (!supabase || !id) return null

  const { data, error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', id)
    .select()
    .single()

  if (error) return null
  return data
}

/**
 * Return every active profile except the caller. Backed by a SECURITY
 * DEFINER RPC so it works across the profiles RLS boundary. Used by the
 * Preferences "share with specific people" checkbox list.
 */
export const listShareableProfiles = async () => {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('list_shareable_profiles')
  if (error || !data) return []
  return data
}

/**
 * Toggle a user's opt-in to the public leaderboard.
 */
export const setLeaderboardVisibility = async (id, visible) => {
  if (!supabase || !id) return null

  const { data, error } = await supabase
    .from('profiles')
    .update({ leaderboard_visible: !!visible })
    .eq('id', id)
    .select()
    .single()

  if (error) return null
  return data
}
