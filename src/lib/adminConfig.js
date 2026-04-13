const STORAGE_KEY = 'wlc-admin-config'

export const DEFAULT_CONFIG = {
  exerciseTypes: ['Running', 'Swimming', 'Weights', 'Yoga', 'CrossFit', 'Cycling', 'Walking', 'HIIT', 'Other'],
  mobilizeTypes: ['Stretching', 'Yoga', 'Foam Rolling', 'Massage', 'Pilates', 'Mobility Drills', 'Other'],
  hydrationTargetMl: 2000,
  hydrationIncrementMl: 250,
  challengeStart: '2026-04-13',
  challengeDays: 75,
}

export const getConfig = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch {}
  return { ...DEFAULT_CONFIG }
}

export const setConfig = (config) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {}
}
