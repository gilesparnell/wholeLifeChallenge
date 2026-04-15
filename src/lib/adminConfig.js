const STORAGE_KEY = 'wlc-admin-config'

export const DEFAULT_CONFIG = {
  exerciseTypes: ['Running', 'Swimming', 'Weights', 'Yoga', 'CrossFit', 'Cycling', 'Walking', 'HIIT', 'Other'],
  mobilizeTypes: ['Stretching', 'Yoga', 'Foam Rolling', 'Massage', 'Pilates', 'Mobility Drills', 'Other'],
  hydrationTargetMl: 2000,
  hydrationIncrementMl: 250,
  sleepTargetHours: 8,
  challengeStart: '2026-04-13',
  challengeDays: 75,
}

// Keys a standard user can override via My Preferences. Everything else
// (challenge dates, exercise/mobilise lists, scoring) stays admin-global.
export const PERSONALISABLE_KEYS = [
  'hydrationTargetMl',
  'hydrationIncrementMl',
  'sleepTargetHours',
]

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
