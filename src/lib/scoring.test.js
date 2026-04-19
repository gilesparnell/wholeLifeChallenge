import { describe, it, expect } from 'vitest'
import { scoreDay, calculateStreak, calculateHabitStreak } from './scoring'
import { emptyDay } from './habits'

describe('emptyDay', () => {
  it('starts exercise and mobilize with empty entries arrays (multi-activity, v0.14.0)', () => {
    const day = emptyDay()
    expect(day.exercise).toEqual({ completed: false, entries: [] })
    expect(day.mobilize).toEqual({ completed: false, entries: [] })
  })

  it('does not add duration_minutes to non-dropdown habits', () => {
    const day = emptyDay()
    expect(day.sleep).toEqual({ completed: false, hours: null })
    expect(day.hydrate).toEqual({ completed: false, current_ml: 0, target_ml: 2000 })
    expect(day.wellbeing).toEqual({ completed: false, activity_text: '' })
    expect(day.reflect).toEqual({ completed: false, reflection_text: '' })
  })
})

describe('scoreDay', () => {
  it('returns 0 for null/undefined input', () => {
    expect(scoreDay(null)).toBe(0)
    expect(scoreDay(undefined)).toBe(0)
  })

  it('returns 0 for empty day', () => {
    expect(scoreDay({})).toBe(0)
  })

  it('returns max 35 for a perfect day', () => {
    const perfectDay = {
      nutrition: 5,
      exercise: { completed: true, type: 'Running' },
      mobilize: { completed: true, type: 'Yoga' },
      sleep: { completed: true, hours: 8 },
      hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
      wellbeing: { completed: true, activity_text: 'Meditation' },
      reflect: { completed: true, reflection_text: 'Good day' },
    }
    expect(scoreDay(perfectDay)).toBe(35)
  })

  it('scores nutrition 0-5 based on value', () => {
    expect(scoreDay({ nutrition: 5 })).toBe(5)
    expect(scoreDay({ nutrition: 3 })).toBe(3)
    expect(scoreDay({ nutrition: 0 })).toBe(0)
  })

  it('clamps negative nutrition to 0', () => {
    expect(scoreDay({ nutrition: -1 })).toBe(0)
  })

  it('scores 5 for each completed habit (new object format)', () => {
    expect(scoreDay({ exercise: { completed: true, type: 'Running' } })).toBe(5)
    expect(scoreDay({ sleep: { completed: true, hours: 7 } })).toBe(5)
  })

  it('scores 0 for incomplete habits (new object format)', () => {
    expect(scoreDay({ exercise: { completed: false } })).toBe(0)
  })

  it('supports legacy boolean format for backwards compatibility', () => {
    expect(scoreDay({ exercise: true })).toBe(5)
    expect(scoreDay({ exercise: false })).toBe(0)
  })

  it('scores correctly with duration_minutes in exercise data', () => {
    expect(scoreDay({ exercise: { completed: true, type: 'Running', duration_minutes: 30 } })).toBe(5)
    expect(scoreDay({ exercise: { completed: true, type: 'Running', duration_minutes: null } })).toBe(5)
    expect(scoreDay({ exercise: { completed: false, type: '', duration_minutes: null } })).toBe(0)
  })

  it('scores reflect as completed when reflection_text is present', () => {
    expect(scoreDay({ reflect: { completed: true, reflection_text: 'entry' } })).toBe(5)
  })

  it('handles mixed old and new formats', () => {
    const mixed = {
      nutrition: 4,
      exercise: true,  // legacy boolean
      mobilize: { completed: true, type: 'Stretching' },  // new format
      sleep: false,  // legacy boolean
    }
    expect(scoreDay(mixed)).toBe(14) // 4 + 5 + 5 + 0
  })

  describe('bonus application', () => {
    it('counts missed nutrition as 5 when indulgence bonus is applied', () => {
      expect(scoreDay({ nutrition: 2, bonusApplied: { indulgence: true } })).toBe(5)
    })

    it('counts missed exercise as completed when rest day bonus is applied', () => {
      expect(scoreDay({
        exercise: { completed: false, type: '', duration_minutes: null },
        bonusApplied: { restDay: true },
      })).toBe(5)
    })

    it('counts missed sleep as completed when night owl bonus is applied', () => {
      expect(scoreDay({
        sleep: { completed: false, hours: null },
        bonusApplied: { nightOwl: true },
      })).toBe(5)
    })

    it('returns max 35 when free day bonus is applied', () => {
      expect(scoreDay({
        nutrition: 0,
        exercise: { completed: false },
        sleep: { completed: false },
        bonusApplied: { freeDay: true },
      })).toBe(35)
    })

    it('stacks multiple bonuses on the same day', () => {
      const day = {
        nutrition: 0,
        exercise: { completed: false },
        mobilize: { completed: true, type: 'Yoga' },
        sleep: { completed: false, hours: null },
        hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
        wellbeing: { completed: true, activity_text: 'Meditation' },
        reflect: { completed: true, reflection_text: 'Good' },
        bonusApplied: { indulgence: true, restDay: true, nightOwl: true },
      }
      expect(scoreDay(day)).toBe(35)
    })
  })
})

describe('calculateStreak', () => {
  it('returns 0 when no data exists', () => {
    expect(calculateStreak({}, [], 0)).toBe(0)
  })

  it('returns 0 when today is not a perfect day', () => {
    const data = { '2026-04-11': { nutrition: 3 } }
    const allDates = ['2026-04-11']
    expect(calculateStreak(data, allDates, 0)).toBe(0)
  })

  it('returns 1 for a single perfect day', () => {
    const perfectDay = {
      nutrition: 5,
      exercise: { completed: true, type: 'Running' },
      mobilize: { completed: true, type: 'Yoga' },
      sleep: { completed: true, hours: 8 },
      hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
      wellbeing: { completed: true, activity_text: 'Meditation' },
      reflect: { completed: true, reflection_text: 'Good day' },
    }
    const data = { '2026-04-11': perfectDay }
    const allDates = ['2026-04-11']
    expect(calculateStreak(data, allDates, 0)).toBe(1)
  })

  it('counts consecutive perfect days backwards from dayIndex', () => {
    const perfect = {
      nutrition: 5,
      exercise: { completed: true, type: 'Running' },
      mobilize: { completed: true, type: 'Yoga' },
      sleep: { completed: true, hours: 8 },
      hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
      wellbeing: { completed: true, activity_text: 'Meditation' },
      reflect: { completed: true, reflection_text: 'Good day' },
    }
    const data = {
      '2026-04-11': { nutrition: 3 },  // not perfect
      '2026-04-12': perfect,
      '2026-04-13': perfect,
    }
    const allDates = ['2026-04-11', '2026-04-12', '2026-04-13']
    expect(calculateStreak(data, allDates, 2)).toBe(2)
  })
})

describe('calculateHabitStreak', () => {
  it('returns 0 when no data exists', () => {
    expect(calculateHabitStreak({}, [], 0, 'exercise')).toBe(0)
  })

  it('returns 1 when only today has the habit completed', () => {
    const data = { '2026-04-11': { exercise: { completed: true, type: 'Running' } } }
    expect(calculateHabitStreak(data, ['2026-04-11'], 0, 'exercise')).toBe(1)
  })

  it('counts consecutive days the habit was completed', () => {
    const data = {
      '2026-04-11': { exercise: { completed: true } },
      '2026-04-12': { exercise: { completed: true } },
      '2026-04-13': { exercise: { completed: true } },
    }
    const allDates = ['2026-04-11', '2026-04-12', '2026-04-13']
    expect(calculateHabitStreak(data, allDates, 2, 'exercise')).toBe(3)
  })

  it('breaks streak on incomplete day', () => {
    const data = {
      '2026-04-11': { exercise: { completed: true } },
      '2026-04-12': { exercise: { completed: false } },
      '2026-04-13': { exercise: { completed: true } },
    }
    const allDates = ['2026-04-11', '2026-04-12', '2026-04-13']
    expect(calculateHabitStreak(data, allDates, 2, 'exercise')).toBe(1)
  })

  it('supports legacy boolean format', () => {
    const data = {
      '2026-04-11': { exercise: true },
      '2026-04-12': { exercise: true },
    }
    const allDates = ['2026-04-11', '2026-04-12']
    expect(calculateHabitStreak(data, allDates, 1, 'exercise')).toBe(2)
  })
})
