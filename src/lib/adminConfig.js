const STORAGE_KEY = 'wlc-admin-config'

export const DEFAULT_CONFIG = {
  exerciseTypes: ['Running', 'Swimming', 'Weights', 'Yoga', 'CrossFit', 'Cycling', 'Walking', 'HIIT', 'Other'],
  mobilizeTypes: ['Stretching', 'Yoga', 'Foam Rolling', 'Massage', 'Pilates', 'Mobility Drills', 'Other'],
  hydrationTargetMl: 2000,
  hydrationIncrementMl: 250,
  sleepTargetHours: 8,
  challengeStart: '2026-04-13',
  challengeDays: 75,
  // Opt-out default: new users are in the celebration circle by default;
  // the browser Notification permission is a separate gate handled from
  // the /preferences toggle (requires user gesture).
  notificationsEnabled: true,
  // Test-mode: when true, the sender also sees a local notification for
  // their own activity flips. Useful for solo QA on a single browser.
  // Opt-in only — normal "Someone special" framing expects this OFF.
  notifyOnOwnActivity: false,
  // Blanket-share overrides. When true, every active user can see the
  // user's wellness / journal data without a per-recipient row in
  // entry_shares. Default off — sharing stays opt-in + recipient-scoped.
  share_wellness_all: false,
  share_journal_all: false,
  share_exercise_all: false,
}

// Keys a standard user can override via My Preferences. Everything else
// (challenge dates, exercise/mobilise lists, scoring) stays admin-global.
export const PERSONALISABLE_KEYS = [
  'hydrationTargetMl',
  'hydrationIncrementMl',
  'sleepTargetHours',
  'notificationsEnabled',
  'notifyOnOwnActivity',
  'share_wellness_all',
  'share_journal_all',
  'share_exercise_all',
]

// Type map for sanitisation. Numeric keys carry range checks;
// boolean keys coerce via Boolean() and persist both true and false.
const PREFERENCE_TYPES = {
  hydrationTargetMl: 'number',
  hydrationIncrementMl: 'number',
  sleepTargetHours: 'number',
  notificationsEnabled: 'boolean',
  notifyOnOwnActivity: 'boolean',
  share_wellness_all: 'boolean',
  share_journal_all: 'boolean',
  share_exercise_all: 'boolean',
}

// Range checks for each personalisable field. Values outside the range are
// silently dropped so a corrupted preferences blob can't wedge the app.
const PREFERENCE_RANGES = {
  hydrationTargetMl: { min: 500, max: 10000 },
  hydrationIncrementMl: { min: 100, max: 1000 },
  sleepTargetHours: { min: 4, max: 14 },
}

export const getConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch {
    // localStorage may be unavailable (privacy mode, quota full) — fall back to defaults
  }
  return { ...DEFAULT_CONFIG }
}

export const setConfig = (config) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage may be unavailable — config change is lost but app still works
  }
}

/**
 * Strip anything that isn't a personalisable key, coerce to number, and
 * drop values outside the allowed range. Returns a plain object ready to
 * persist as profile.preferences.
 */
export const sanitisePreferences = (input) => {
  if (!input || typeof input !== 'object') return {}
  const clean = {}
  for (const key of PERSONALISABLE_KEYS) {
    if (!(key in input)) continue
    const raw = input[key]
    const type = PREFERENCE_TYPES[key] ?? 'number'
    if (type === 'boolean') {
      clean[key] = Boolean(raw)
      continue
    }
    const num = typeof raw === 'number' ? raw : parseFloat(raw)
    if (!Number.isFinite(num)) continue
    const range = PREFERENCE_RANGES[key]
    if (range && (num < range.min || num > range.max)) continue
    clean[key] = num
  }
  return clean
}

/**
 * Return the config that should drive the UI for a given profile — the
 * global admin config with the user's sanitised preferences layered on top.
 * Passing null / undefined / a profile without preferences returns the raw
 * global config, so it's safe to call before the profile has loaded.
 */
export const getEffectiveConfig = (profile) => {
  const global = getConfig()
  const prefs = sanitisePreferences(profile?.preferences)
  return { ...global, ...prefs }
}
