// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rowToEntry, entryToRow, fetchAllEntries, upsertEntry, clearAllEntries } from './supabaseStore'

// Mock supabase
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

import { supabase } from './supabase'

describe('supabaseStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- rowToEntry: DB row → app format ---
  describe('rowToEntry', () => {
    it('converts a DB row to { date: dayData } format', () => {
      const row = {
        date: '2026-04-11',
        nutrition: 4,
        exercise: { completed: true, type: 'Running' },
        mobilize: { completed: false, type: '' },
        sleep: { completed: true, hours: 7.5 },
        hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
        wellbeing: { completed: false, activity_text: '' },
        reflect: { completed: true, reflection_text: 'Good day' },
      }
      const result = rowToEntry(row)
      expect(result.date).toBe('2026-04-11')
      expect(result.dayData.nutrition).toBe(4)
      expect(result.dayData.exercise).toEqual({ completed: true, type: 'Running' })
      expect(result.dayData.reflect).toEqual({ completed: true, reflection_text: 'Good day' })
    })

    it('handles null/undefined fields with defaults', () => {
      const row = { date: '2026-04-11', nutrition: null }
      const result = rowToEntry(row)
      expect(result.dayData.nutrition).toBe(5)
      expect(result.dayData.exercise).toEqual({ completed: false, type: '' })
    })

    // Regression: the "How Do You Feel?" 1-5 self-report section on CheckIn
    // persists values under `dayData.selfReport`. It was added in v3 Phase 3
    // but never round-tripped through Supabase, so cloud users lost the
    // value on any refetch (page reload, tab foreground). Fixed in 0.14.4.
    it('round-trips selfReport from a DB row', () => {
      const row = {
        date: '2026-04-19',
        nutrition: 5,
        selfReport: { mood: 4, energyLevel: 3, soreness: 2, stressLevel: 2, sleepQuality: 5, sleepHours: 7.5 },
      }
      const result = rowToEntry(row)
      expect(result.dayData.selfReport).toEqual({
        mood: 4, energyLevel: 3, soreness: 2, stressLevel: 2, sleepQuality: 5, sleepHours: 7.5,
      })
    })

    // Regression: bonusApplied flags (Indulgence / Rest Day / Night Owl /
    // Free Day) drive scoring and must persist or a user-activated Free Day
    // evaporates on refetch. Same root cause as selfReport.
    it('round-trips bonusApplied from a DB row', () => {
      const row = {
        date: '2026-04-19',
        nutrition: 5,
        bonusApplied: { freeDay: true },
      }
      const result = rowToEntry(row)
      expect(result.dayData.bonusApplied).toEqual({ freeDay: true })
    })
  })

  // --- entryToRow: app format → DB row ---
  describe('entryToRow', () => {
    it('converts app day data to a DB row', () => {
      const dayData = {
        nutrition: 5,
        exercise: { completed: true, type: 'HIIT' },
        mobilize: { completed: true, type: 'Yoga' },
        sleep: { completed: true, hours: 8 },
        hydrate: { completed: true, current_ml: 2500, target_ml: 2000 },
        wellbeing: { completed: true, activity_text: 'Meditation' },
        reflect: { completed: true, reflection_text: 'Great day' },
      }
      const row = entryToRow('user-123', '2026-04-11', dayData)
      expect(row.user_id).toBe('user-123')
      expect(row.date).toBe('2026-04-11')
      expect(row.nutrition).toBe(5)
      expect(row.exercise).toEqual({ completed: true, type: 'HIIT' })
      expect(row.reflect).toEqual({ completed: true, reflection_text: 'Great day' })
    })

    it('includes updated_at timestamp', () => {
      const row = entryToRow('user-123', '2026-04-11', { nutrition: 5 })
      expect(row.updated_at).toBeDefined()
    })

    // Regression (0.14.4): the "How Do You Feel?" selfReport payload used
    // to be silently stripped before upsert because `selfReport` wasn't in
    // the persisted-keys list. Cloud users lost it on every Supabase
    // refetch — the symptom was "switch to another day and back, values
    // are gone".
    it('includes selfReport in the upsert payload', () => {
      const dayData = {
        nutrition: 5,
        selfReport: { mood: 4, energyLevel: 3, soreness: 2, stressLevel: 2, sleepQuality: 5, sleepHours: 7.5 },
      }
      const row = entryToRow('user-123', '2026-04-19', dayData)
      expect(row.selfReport).toEqual({
        mood: 4, energyLevel: 3, soreness: 2, stressLevel: 2, sleepQuality: 5, sleepHours: 7.5,
      })
    })

    it('includes bonusApplied in the upsert payload', () => {
      const dayData = { nutrition: 5, bonusApplied: { freeDay: true } }
      const row = entryToRow('user-123', '2026-04-19', dayData)
      expect(row.bonusApplied).toEqual({ freeDay: true })
    })
  })

  // --- fetchAllEntries ---
  describe('fetchAllEntries', () => {
    it('fetches all entries for a user and returns app-format object', async () => {
      const mockRows = [
        { date: '2026-04-11', nutrition: 5, exercise: { completed: true, type: 'Running' }, mobilize: null, sleep: null, hydrate: null, wellbeing: null, reflect: null },
        { date: '2026-04-12', nutrition: 3, exercise: null, mobilize: null, sleep: null, hydrate: null, wellbeing: null, reflect: null },
      ]
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
        }),
      })
      supabase.from.mockReturnValue({ select: selectMock })

      const result = await fetchAllEntries('user-123')
      expect(supabase.from).toHaveBeenCalledWith('daily_entries')
      expect(result['2026-04-11'].nutrition).toBe(5)
      expect(result['2026-04-11'].exercise).toEqual({ completed: true, type: 'Running' })
      expect(result['2026-04-12'].nutrition).toBe(3)
    })

    it('returns empty object on error', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
        }),
      })
      supabase.from.mockReturnValue({ select: selectMock })

      const result = await fetchAllEntries('user-123')
      expect(result).toEqual({})
    })

    it('returns empty object when data is empty array', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })
      supabase.from.mockReturnValue({ select: selectMock })

      const result = await fetchAllEntries('user-123')
      expect(result).toEqual({})
    })
  })

  // --- upsertEntry ---
  describe('upsertEntry', () => {
    it('upserts a day entry and returns success', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ data: {}, error: null })
      supabase.from.mockReturnValue({ upsert: upsertMock })

      const dayData = { nutrition: 5, exercise: { completed: true, type: 'Running' } }
      const result = await upsertEntry('user-123', '2026-04-11', dayData)

      expect(supabase.from).toHaveBeenCalledWith('daily_entries')
      expect(upsertMock).toHaveBeenCalled()
      const upsertArg = upsertMock.mock.calls[0][0]
      expect(upsertArg.user_id).toBe('user-123')
      expect(upsertArg.date).toBe('2026-04-11')
      expect(result).toEqual({ success: true })
    })

    it('returns error on failure', async () => {
      const upsertMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS denied' } })
      supabase.from.mockReturnValue({ upsert: upsertMock })

      const result = await upsertEntry('user-123', '2026-04-11', { nutrition: 5 })
      expect(result).toEqual({ success: false, error: 'RLS denied' })
    })

    // #17: client-side defence in depth — short-circuit before hitting
    // Supabase if the data violates the same constraints the DB enforces.
    it('rejects nutrition=99 without calling supabase', async () => {
      const upsertMock = vi.fn()
      supabase.from.mockReturnValue({ upsert: upsertMock })

      const result = await upsertEntry('user-123', '2026-04-11', { nutrition: 99 })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/nutrition/i)
      expect(upsertMock).not.toHaveBeenCalled()
    })

    it('rejects sleep.hours=30 without calling supabase', async () => {
      const upsertMock = vi.fn()
      supabase.from.mockReturnValue({ upsert: upsertMock })

      const result = await upsertEntry('user-123', '2026-04-11', {
        sleep: { completed: true, hours: 30 },
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/sleep/i)
      expect(upsertMock).not.toHaveBeenCalled()
    })

    it('rejects negative hydrate.current_ml without calling supabase', async () => {
      const upsertMock = vi.fn()
      supabase.from.mockReturnValue({ upsert: upsertMock })

      const result = await upsertEntry('user-123', '2026-04-11', {
        hydrate: { completed: false, current_ml: -10, target_ml: 2000 },
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/hydrate/i)
      expect(upsertMock).not.toHaveBeenCalled()
    })
  })

  // --- clearAllEntries ---
  describe('clearAllEntries', () => {
    it('deletes all daily_entries for the given user_id', async () => {
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: null })
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
      supabase.from.mockReturnValue({ delete: deleteMock })

      const result = await clearAllEntries('user-123')

      expect(supabase.from).toHaveBeenCalledWith('daily_entries')
      expect(deleteMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-123')
      expect(result).toEqual({ success: true })
    })

    it('returns error when delete fails', async () => {
      const eqMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'RLS denied' } })
      const deleteMock = vi.fn().mockReturnValue({ eq: eqMock })
      supabase.from.mockReturnValue({ delete: deleteMock })

      const result = await clearAllEntries('user-123')
      expect(result).toEqual({ success: false, error: 'RLS denied' })
    })

    it('returns error when no user_id provided', async () => {
      const result = await clearAllEntries(null)
      expect(result.success).toBe(false)
    })

    it('does not call supabase when user_id is empty', async () => {
      await clearAllEntries('')
      expect(supabase.from).not.toHaveBeenCalled()
    })
  })
})
