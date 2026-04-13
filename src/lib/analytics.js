// Thin PostHog wrapper.
//
// All PII protection lives here so call sites don't have to remember.
// Only the Supabase user UUID is ever sent to PostHog as the distinct id —
// no email, no display name, no reflexion text. Track events should pass
// counts and category labels, never freeform user content.

import posthog from 'posthog-js'

let initialised = false

const getKey = () => import.meta.env.VITE_POSTHOG_KEY || ''
const getHost = () => import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

// Property keys that must never be sent to PostHog. Defence in depth —
// callers should not pass these, but if they do, strip them silently.
const PII_KEYS = new Set([
  'email',
  'name',
  'display_name',
  'displayName',
  'full_name',
  'fullName',
  'avatar_url',
  'avatarUrl',
  'reflection_text',
  'reflectionText',
  'activity_text',
  'activityText',
  'journal_text',
  'journalText',
  'phone',
  'address',
])

const stripPii = (props) => {
  if (!props || typeof props !== 'object') return {}
  const out = {}
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEYS.has(key)) continue
    out[key] = value
  }
  return out
}

/**
 * Initialise PostHog once at app startup. No-op if VITE_POSTHOG_KEY is not
 * set. Safe to call multiple times — subsequent calls are ignored.
 */
export const initAnalytics = () => {
  if (initialised) return
  const key = getKey()
  if (!key) return

  posthog.init(key, {
    api_host: getHost(),
    autocapture: false,
    disable_session_recording: true,
    capture_pageleave: false,
    capture_pageview: false,
    person_profiles: 'identified_only',
  })
  initialised = true
}

/**
 * Bind the current Supabase user id to the analytics distinct_id. Pass
 * { id } only — any other fields (email, display_name) are deliberately
 * ignored to keep PII out of PostHog.
 */
export const identifyUser = (user) => {
  if (!initialised) return
  if (!user || !user.id) return
  posthog.identify(user.id)
}

/** Clear the bound distinct_id on sign-out. */
export const resetUser = () => {
  if (!initialised) return
  posthog.reset()
}

/**
 * Track a custom event. Properties are stripped of PII keys before send.
 * Pass counts, category labels, durations — never freeform text from
 * the user.
 */
export const track = (event, properties) => {
  if (!initialised) return
  posthog.capture(event, stripPii(properties))
}
