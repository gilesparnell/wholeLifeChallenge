import { describe, it, expect } from 'vitest'
import {
  emptyDay,
  getExerciseEntries,
  getTotalExerciseMinutes,
} from './habits'

describe('emptyDay (multi-activity shape)', () => {
  it('starts exercise + mobilize with empty entries arrays', () => {
    const day = emptyDay()
    expect(day.exercise).toEqual({ completed: false, entries: [] })
    expect(day.mobilize).toEqual({ completed: false, entries: [] })
  })
})

describe('getExerciseEntries', () => {
  it('returns the entries array when given the new shape', () => {
    const ex = {
      completed: true,
      entries: [
        { type: 'Running', duration_minutes: 30 },
        { type: 'Swimming', duration_minutes: 15 },
      ],
    }
    expect(getExerciseEntries(ex)).toEqual([
      { type: 'Running', duration_minutes: 30 },
      { type: 'Swimming', duration_minutes: 15 },
    ])
  })

  it('returns a single-entry array for the legacy shape with type + duration', () => {
    const ex = { completed: true, type: 'Running', duration_minutes: 30 }
    expect(getExerciseEntries(ex)).toEqual([
      { type: 'Running', duration_minutes: 30 },
    ])
  })

  it('returns a single-entry array for the legacy shape with type but no duration', () => {
    const ex = { completed: true, type: 'Yoga' }
    expect(getExerciseEntries(ex)).toEqual([
      { type: 'Yoga', duration_minutes: null },
    ])
  })

  it('returns an empty array for legacy shape with no type and no duration', () => {
    const ex = { completed: false, type: '', duration_minutes: null }
    expect(getExerciseEntries(ex)).toEqual([])
  })

  it('returns an empty array for the new shape when entries is empty', () => {
    expect(getExerciseEntries({ completed: false, entries: [] })).toEqual([])
  })

  it('returns an empty array for null / undefined input', () => {
    expect(getExerciseEntries(null)).toEqual([])
    expect(getExerciseEntries(undefined)).toEqual([])
  })

  it('returns an empty array for non-object input', () => {
    expect(getExerciseEntries(42)).toEqual([])
    expect(getExerciseEntries('Running')).toEqual([])
  })

  it('prefers entries when both legacy and new fields are present', () => {
    const ex = {
      completed: true,
      type: 'Running',
      duration_minutes: 30,
      entries: [{ type: 'Cycling', duration_minutes: 60 }],
    }
    expect(getExerciseEntries(ex)).toEqual([
      { type: 'Cycling', duration_minutes: 60 },
    ])
  })

  it('drops malformed entries (no type) silently', () => {
    const ex = {
      completed: true,
      entries: [
        { type: 'Running', duration_minutes: 30 },
        { duration_minutes: 15 }, // missing type — drop
        null, // drop
        { type: '', duration_minutes: 20 }, // empty type — drop
      ],
    }
    expect(getExerciseEntries(ex)).toEqual([
      { type: 'Running', duration_minutes: 30 },
    ])
  })

  it('coerces missing duration to null on each entry', () => {
    const ex = {
      completed: true,
      entries: [{ type: 'Yoga' }],
    }
    expect(getExerciseEntries(ex)).toEqual([
      { type: 'Yoga', duration_minutes: null },
    ])
  })
})

describe('getTotalExerciseMinutes', () => {
  it('sums durations across the new shape entries', () => {
    const ex = {
      completed: true,
      entries: [
        { type: 'Running', duration_minutes: 30 },
        { type: 'Swimming', duration_minutes: 15 },
        { type: 'Gym', duration_minutes: 45 },
      ],
    }
    expect(getTotalExerciseMinutes(ex)).toBe(90)
  })

  it('treats null durations as zero in the sum', () => {
    const ex = {
      completed: true,
      entries: [
        { type: 'Running', duration_minutes: 30 },
        { type: 'Yoga', duration_minutes: null },
      ],
    }
    expect(getTotalExerciseMinutes(ex)).toBe(30)
  })

  it('returns the legacy single duration when entries is absent', () => {
    expect(getTotalExerciseMinutes({ completed: true, type: 'Running', duration_minutes: 30 })).toBe(30)
  })

  it('returns 0 when there are no entries and no legacy duration', () => {
    expect(getTotalExerciseMinutes({ completed: false, entries: [] })).toBe(0)
    expect(getTotalExerciseMinutes({ completed: false, type: '', duration_minutes: null })).toBe(0)
  })

  it('returns 0 for null / undefined input', () => {
    expect(getTotalExerciseMinutes(null)).toBe(0)
    expect(getTotalExerciseMinutes(undefined)).toBe(0)
  })
})
