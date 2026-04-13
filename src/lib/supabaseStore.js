import { supabase } from './supabase'
import { validateDayData } from './dayDataValidator'

const DEFAULTS = {
  nutrition: 5,
  exercise: { completed: false, type: '' },
  mobilize: { completed: false, type: '' },
  sleep: { completed: false, hours: 0 },
  hydrate: { completed: false, current_ml: 0, target_ml: 2000 },
  wellbeing: { completed: false, activity_text: '' },
  reflect: { completed: false, reflection_text: '' },
}

const HABIT_KEYS = ['nutrition', 'exercise', 'mobilize', 'sleep', 'hydrate', 'wellbeing', 'reflect']

/** Convert a DB row to { date, dayData } app format */
export function rowToEntry(row) {
  const dayData = {}
  for (const key of HABIT_KEYS) {
    dayData[key] = row[key] ?? DEFAULTS[key]
  }
  return { date: row.date, dayData }
}

/** Convert app day data to a DB row */
export function entryToRow(userId, date, dayData) {
  const row = {
    user_id: userId,
    date,
    updated_at: new Date().toISOString(),
  }
  for (const key of HABIT_KEYS) {
    if (dayData[key] !== undefined) {
      row[key] = dayData[key]
    }
  }
  return row
}

/** Fetch all entries for a user, returns { '2026-04-11': dayData, ... } */
export async function fetchAllEntries(userId) {
  const { data, error } = await supabase
    .from('daily_entries')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })

  if (error || !data) {
    return {}
  }

  const entries = {}
  for (const row of data) {
    const { date, dayData } = rowToEntry(row)
    entries[date] = dayData
  }
  return entries
}

/** Upsert a single day entry */
export async function upsertEntry(userId, date, dayData) {
  // Defence in depth: catch out-of-range values here so the user gets a
  // clear error instead of a generic 400 from PostgREST. The DB still
  // enforces the same rules via CHECK constraints.
  const validation = validateDayData(dayData)
  if (!validation.valid) {
    return { success: false, error: validation.errors.join('; ') }
  }

  const row = entryToRow(userId, date, dayData)
  const { error } = await supabase
    .from('daily_entries')
    .upsert(row, { onConflict: 'user_id,date' })

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}

/**
 * Delete all daily_entries for a given user. Used by the "Clear All Data"
 * button in the admin page.
 */
export async function clearAllEntries(userId) {
  if (!userId) {
    return { success: false, error: 'Missing user_id' }
  }

  const { error } = await supabase
    .from('daily_entries')
    .delete()
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }
  return { success: true }
}
