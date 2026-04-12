import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rowToEntry, entryToRow, fetchAllEntries, upsertEntry } from './supabaseStore'

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
  })
})
