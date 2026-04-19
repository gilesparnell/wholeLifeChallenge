export const HABITS = [
  { id: 'exercise', label: 'Exercise', icon: '\u{1F3C3}', desc: '10+ min activity', color: '#E8634A', type: 'dropdown' },
  { id: 'mobilize', label: 'Mobilize', icon: '\u{1F9D8}', desc: '10 min stretching', color: '#E8A34A', type: 'dropdown' },
  { id: 'sleep', label: 'Sleep', icon: '\u{1F634}', desc: 'Log your hours', color: '#6B5CE7', type: 'hours' },
  { id: 'hydrate', label: 'Hydrate', icon: '\u{1F4A7}', desc: 'Track your water', color: '#4AAFE8', type: 'increment' },
  { id: 'wellbeing', label: 'Well-Being', icon: '\u{1F33F}', desc: 'Weekly practice', color: '#4AE88A', type: 'modal' },
  { id: 'reflect', label: 'Reflect', icon: '\u{1F4DD}', desc: 'Daily journal', color: '#E84A8A', type: 'modal' },
]

export const emptyDay = () => ({
  nutrition: 5,
  exercise: { completed: false, entries: [] },
  mobilize: { completed: false, entries: [] },
  sleep: { completed: false, hours: null },
  hydrate: { completed: false, current_ml: 0, target_ml: 2000 },
  wellbeing: { completed: false, activity_text: '' },
  reflect: { completed: false, reflection_text: '' },
  selfReport: null,
  bonusApplied: {},
})

// Multi-activity helpers (v0.14.0).
//
// The exercise + mobilise habits store an `entries` array of
// { type, duration_minutes } items. Pre-0.14.0 rows have the legacy
// shape { type, duration_minutes } at the top level. Readers go through
// these helpers so old rows render correctly forever — no destructive
// migration is required.

const normaliseEntry = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const type = typeof raw.type === 'string' ? raw.type.trim() : ''
  if (!type) return null
  const duration = Number.isFinite(raw.duration_minutes) ? raw.duration_minutes : null
  return { type, duration_minutes: duration }
}

export const getExerciseEntries = (slot) => {
  if (!slot || typeof slot !== 'object') return []
  if (Array.isArray(slot.entries)) {
    return slot.entries.map(normaliseEntry).filter(Boolean)
  }
  // Legacy shape — single optional entry derived from top-level fields
  const legacy = normaliseEntry({
    type: slot.type,
    duration_minutes: slot.duration_minutes,
  })
  return legacy ? [legacy] : []
}

export const getTotalExerciseMinutes = (slot) => {
  const entries = getExerciseEntries(slot)
  return entries.reduce(
    (acc, e) => acc + (Number.isFinite(e.duration_minutes) ? e.duration_minutes : 0),
    0,
  )
}
