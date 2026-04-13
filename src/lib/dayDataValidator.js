// Defence-in-depth: validates dayData shape before it reaches Supabase.
// Mirrors the CHECK constraints added in
// supabase/migrations/20260413000010_daily_entries_check_constraints.sql
// so callers get a clear error client-side instead of a generic 400 from
// PostgREST. The DB still enforces the same rules — this is a friendlier
// front gate, not the only gate.

export const NUTRITION_MIN = 0
export const NUTRITION_MAX = 5
export const SLEEP_HOURS_MAX = 24

const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v)

const validateNumber = (value, label, { min, max } = {}) => {
  if (value === undefined || value === null) return null
  if (!isFiniteNumber(value)) {
    return `${label} must be a finite number`
  }
  if (min !== undefined && value < min) {
    return `${label} must be >= ${min}`
  }
  if (max !== undefined && value > max) {
    return `${label} must be <= ${max}`
  }
  return null
}

export function validateDayData(dayData) {
  if (dayData === null || dayData === undefined) {
    return { valid: false, errors: ['dayData is required'] }
  }

  const errors = []
  const push = (err) => { if (err) errors.push(err) }

  push(validateNumber(dayData.nutrition, 'nutrition', { min: NUTRITION_MIN, max: NUTRITION_MAX }))

  if (dayData.sleep && typeof dayData.sleep === 'object') {
    push(validateNumber(dayData.sleep.hours, 'sleep.hours', { min: 0, max: SLEEP_HOURS_MAX }))
  }

  if (dayData.hydrate && typeof dayData.hydrate === 'object') {
    push(validateNumber(dayData.hydrate.current_ml, 'hydrate.current_ml', { min: 0 }))
    push(validateNumber(dayData.hydrate.target_ml, 'hydrate.target_ml', { min: 0 }))
  }

  return { valid: errors.length === 0, errors }
}
