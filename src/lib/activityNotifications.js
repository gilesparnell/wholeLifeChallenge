// Activity-flip detection + user-facing message composition for the
// "Someone special" celebration notifications (v0.12.0).
//
// Payload contract — the broadcast channel and the future Web Push edge
// function MUST produce / consume the same shape:
//
//   { activity: 'exercise' | 'wellbeing' | 'reflect' | 'hydrate',
//     exerciseType?: string,
//     durationMinutes?: number }
//
// Deliberately anonymous — no user name, no user id, no reflection_text,
// no well-being activity_text ever reaches this module. If a caller tries
// to pass PII through the payload shape we still ignore it during compose.

export const NOTIFICATION_TITLE = 'Whole Life Challenge'
export const NOTIFICATION_TAG_PREFIX = 'wlc-activity-'

// Order here is also the canonical order of flips in the return array.
const WATCHED_ACTIVITIES = ['exercise', 'wellbeing', 'reflect', 'hydrate']

const wasCompleted = (dayData, activity) => {
  if (!dayData || typeof dayData !== 'object') return false
  const slot = dayData[activity]
  return !!(slot && slot.completed)
}

const flipPayload = (activity, nextSlot) => {
  if (activity !== 'exercise') return { activity }
  const payload = { activity: 'exercise' }
  if (!nextSlot || typeof nextSlot !== 'object') return payload

  // Prefer the v0.14.0 entries[] shape; fall back to the pre-0.14.0
  // top-level fields. The first entry drives the broadcast — multi-entry
  // days only celebrate the first activity logged.
  const firstEntry = Array.isArray(nextSlot.entries) ? nextSlot.entries[0] : null
  const type = firstEntry && typeof firstEntry.type === 'string' && firstEntry.type.length > 0
    ? firstEntry.type
    : (typeof nextSlot.type === 'string' && nextSlot.type.length > 0 ? nextSlot.type : null)
  const duration = firstEntry && Number.isFinite(firstEntry.duration_minutes)
    ? firstEntry.duration_minutes
    : (Number.isFinite(nextSlot.duration_minutes) ? nextSlot.duration_minutes : null)

  if (type) payload.exerciseType = type
  if (duration !== null) payload.durationMinutes = duration
  return payload
}

export const detectActivityFlips = (prevDay, nextDay) => {
  if (!nextDay || typeof nextDay !== 'object') return []
  const flips = []
  for (const activity of WATCHED_ACTIVITIES) {
    const prev = wasCompleted(prevDay, activity)
    const next = wasCompleted(nextDay, activity)
    if (!prev && next) {
      flips.push(flipPayload(activity, nextDay[activity]))
    }
  }
  return flips
}

export const composeMessage = (flip) => {
  if (!flip || typeof flip !== 'object') return null
  const { activity, exerciseType, durationMinutes } = flip
  switch (activity) {
    case 'exercise': {
      if (Number.isFinite(durationMinutes) && exerciseType) {
        return {
          title: NOTIFICATION_TITLE,
          body: `Someone special has just completed ${durationMinutes} min of ${exerciseType}`,
        }
      }
      if (exerciseType) {
        return {
          title: NOTIFICATION_TITLE,
          body: `Someone special has just completed ${exerciseType}`,
        }
      }
      return {
        title: NOTIFICATION_TITLE,
        body: 'Someone special has just completed an exercise',
      }
    }
    case 'wellbeing':
      return {
        title: NOTIFICATION_TITLE,
        body: 'Someone special has just completed a well-being activity',
      }
    case 'reflect':
      return {
        title: NOTIFICATION_TITLE,
        body: 'Someone special has just completed their daily reflection',
      }
    case 'hydrate':
      return {
        title: NOTIFICATION_TITLE,
        body: 'Someone special has just hit their hydration target',
      }
    default:
      return null
  }
}

export const tagFor = (flip, dateISO) => {
  const activity = flip && flip.activity ? flip.activity : 'unknown'
  const compact = typeof dateISO === 'string' ? dateISO.replace(/-/g, '') : 'nodate'
  return `${NOTIFICATION_TAG_PREFIX}${activity}-${compact}`
}
