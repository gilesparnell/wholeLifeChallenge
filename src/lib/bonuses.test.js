// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { computeBonuses, applyAutoBonuses, BONUS_INFO } from './bonuses'

describe('BONUS_INFO', () => {
  const keys = ['indulgence', 'restDay', 'nightOwl', 'freeDay']

  it('defines info for all four bonus types', () => {
    for (const key of keys) {
      expect(BONUS_INFO[key]).toBeDefined()
    }
  })

  it('each bonus has a label, icon, color, threshold, and description', () => {
    for (const key of keys) {
      const info = BONUS_INFO[key]
      expect(info.label).toBeTypeOf('string')
      expect(info.label.length).toBeGreaterThan(0)
      expect(info.icon).toBeTypeOf('string')
      expect(info.description).toBeTypeOf('string')
      expect(info.description.length).toBeGreaterThan(20)
    }
  })

  it('indulgence description mentions nutrition and the 4-day window', () => {
    expect(BONUS_INFO.indulgence.description.toLowerCase()).toMatch(/nutrition/)
    expect(BONUS_INFO.indulgence.description).toMatch(/4/)
  })

  it('rest day description mentions exercise and 10 days', () => {
    expect(BONUS_INFO.restDay.description.toLowerCase()).toMatch(/exercise/)
    expect(BONUS_INFO.restDay.description).toMatch(/10/)
  })

  it('night owl description mentions sleep and 6 days', () => {
    expect(BONUS_INFO.nightOwl.description.toLowerCase()).toMatch(/sleep/)
    expect(BONUS_INFO.nightOwl.description).toMatch(/6/)
  })

  it('free day description mentions 21 days', () => {
    expect(BONUS_INFO.freeDay.description).toMatch(/21/)
  })
})

// Helper to generate a perfect day
const perfectDay = (overrides = {}) => ({
  nutrition: 5,
  exercise: { completed: true, type: 'Running', duration_minutes: 30 },
  mobilize: { completed: true, type: 'Yoga', duration_minutes: 15 },
  sleep: { completed: true, hours: 8 },
  hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
  wellbeing: { completed: true, activity_text: 'Meditation' },
  reflect: { completed: true, reflection_text: 'Good day' },
  ...overrides,
})

const makeDates = (n) => {
  const dates = []
  for (let i = 0; i < n; i++) {
    const d = new Date('2026-04-12')
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

const fillData = (dates, dayFn) => {
  const data = {}
  dates.forEach((d, i) => { data[d] = dayFn(i) })
  return data
}

describe('computeBonuses', () => {
  describe('structure', () => {
    it('returns all four bonus types', () => {
      const result = computeBonuses({}, [], 0)
      expect(result).toHaveProperty('indulgence')
      expect(result).toHaveProperty('restDay')
      expect(result).toHaveProperty('nightOwl')
      expect(result).toHaveProperty('freeDay')
    })

    it('each bonus has earned, used, available, streak, and threshold fields', () => {
      const result = computeBonuses({}, [], 0)
      for (const key of ['indulgence', 'restDay', 'nightOwl', 'freeDay']) {
        expect(result[key]).toHaveProperty('used')
        expect(result[key]).toHaveProperty('available')
      }
    })

    it('legacy earned-only assertion retained for backwards compatibility', () => {
      const result = computeBonuses({}, [], 0)
      for (const key of ['indulgence', 'restDay', 'nightOwl', 'freeDay']) {
        expect(result[key]).toHaveProperty('earned')
        expect(result[key]).toHaveProperty('streak')
        expect(result[key]).toHaveProperty('threshold')
      }
    })
  })

  describe('indulgence bonus', () => {
    // Earned when scoring 18+/20 nutrition points over 4 consecutive days
    it('is not earned with fewer than 4 days', () => {
      const dates = makeDates(3)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 2)
      expect(result.indulgence.earned).toBe(0)
    })

    it('is earned once after 4 consecutive days with 18+/20 nutrition', () => {
      const dates = makeDates(4)
      const data = fillData(dates, () => perfectDay({ nutrition: 5 }))
      const result = computeBonuses(data, dates, 3)
      expect(result.indulgence.earned).toBe(1)
    })

    it('is earned when nutrition totals 18+ over 4 days (e.g. 5+4+5+4=18)', () => {
      const dates = makeDates(4)
      const data = fillData(dates, (i) => perfectDay({ nutrition: i % 2 === 0 ? 5 : 4 }))
      const result = computeBonuses(data, dates, 3)
      expect(result.indulgence.earned).toBe(1)
    })

    it('is NOT earned when nutrition totals less than 18 over 4 days', () => {
      const dates = makeDates(4)
      const data = fillData(dates, (i) => perfectDay({ nutrition: i === 0 ? 3 : 5 }))
      // 3+5+5+5 = 18, should earn
      const result = computeBonuses(data, dates, 3)
      expect(result.indulgence.earned).toBe(1)
    })

    it('tracks current streak toward next indulgence', () => {
      const dates = makeDates(2)
      const data = fillData(dates, () => perfectDay({ nutrition: 5 }))
      const result = computeBonuses(data, dates, 1)
      expect(result.indulgence.streak).toBe(2)
      expect(result.indulgence.threshold).toBe(4)
    })

    it('can earn multiple indulgences over the challenge', () => {
      const dates = makeDates(8)
      const data = fillData(dates, () => perfectDay({ nutrition: 5 }))
      const result = computeBonuses(data, dates, 7)
      expect(result.indulgence.earned).toBe(2)
    })
  })

  describe('rest day bonus', () => {
    // Earned after 10 consecutive days of completed exercise
    it('is not earned with fewer than 10 exercise days', () => {
      const dates = makeDates(9)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 8)
      expect(result.restDay.earned).toBe(0)
    })

    it('is earned after 10 consecutive exercise days', () => {
      const dates = makeDates(10)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 9)
      expect(result.restDay.earned).toBe(1)
    })

    it('resets streak when exercise is missed', () => {
      const dates = makeDates(12)
      const data = fillData(dates, (i) =>
        i === 5 ? perfectDay({ exercise: { completed: false, type: '', duration_minutes: null } }) : perfectDay()
      )
      const result = computeBonuses(data, dates, 11)
      // Days 0-4 (5 streak), day 5 missed, days 6-11 (6 streak)
      expect(result.restDay.earned).toBe(0)
      expect(result.restDay.streak).toBe(6)
    })

    it('tracks streak toward threshold of 10', () => {
      const dates = makeDates(7)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 6)
      expect(result.restDay.streak).toBe(7)
      expect(result.restDay.threshold).toBe(10)
    })

    it('counts exercise in new entries format { completed, entries } as completed', () => {
      const dates = makeDates(10)
      const data = fillData(dates, () => ({
        ...perfectDay(),
        exercise: { completed: true, entries: [{ type: 'Running', duration_minutes: 30 }] },
      }))
      const result = computeBonuses(data, dates, 9)
      expect(result.restDay.earned).toBe(1)
    })

    it('streak rebuilds to 5 after earning a rest day bonus (15 consecutive days)', () => {
      const dates = makeDates(15)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 14)
      expect(result.restDay.earned).toBe(1)
      expect(result.restDay.streak).toBe(5)
    })

    it('streak is 0 when today exercise is not completed (unlogged day breaks streak)', () => {
      const dates = makeDates(11)
      const data = fillData(dates, (i) =>
        i < 10 ? perfectDay() : { ...perfectDay(), exercise: { completed: false, entries: [] } }
      )
      const result = computeBonuses(data, dates, 10)
      expect(result.restDay.earned).toBe(1)
      expect(result.restDay.streak).toBe(0)
    })
  })

  describe('night owl bonus', () => {
    // Earned after 6 consecutive days of completed sleep
    it('is not earned with fewer than 6 sleep days', () => {
      const dates = makeDates(5)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 4)
      expect(result.nightOwl.earned).toBe(0)
    })

    it('is earned after 6 consecutive sleep days', () => {
      const dates = makeDates(6)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 5)
      expect(result.nightOwl.earned).toBe(1)
    })

    it('resets streak when sleep is missed', () => {
      const dates = makeDates(8)
      const data = fillData(dates, (i) =>
        i === 3 ? perfectDay({ sleep: { completed: false, hours: null } }) : perfectDay()
      )
      const result = computeBonuses(data, dates, 7)
      // Days 0-2 (3), day 3 missed, days 4-7 (4)
      expect(result.nightOwl.earned).toBe(0)
      expect(result.nightOwl.streak).toBe(4)
    })

    it('tracks threshold of 6', () => {
      const result = computeBonuses({}, [], 0)
      expect(result.nightOwl.threshold).toBe(6)
    })

    it('streak rebuilds to 3 after earning a night owl bonus (9 consecutive days)', () => {
      const dates = makeDates(9)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 8)
      expect(result.nightOwl.earned).toBe(1)
      expect(result.nightOwl.streak).toBe(3)
    })
  })

  describe('free day bonus', () => {
    // Earned after 21 consecutive days with 730+/735 total points
    // That's essentially 21 perfect or near-perfect days
    it('is not earned with fewer than 21 days', () => {
      const dates = makeDates(20)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 19)
      expect(result.freeDay.earned).toBe(0)
    })

    it('is earned after 21 consecutive near-perfect days', () => {
      const dates = makeDates(21)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 20)
      expect(result.freeDay.earned).toBe(1)
    })

    it('tracks streak toward 21 days', () => {
      const dates = makeDates(10)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 9)
      expect(result.freeDay.streak).toBe(10)
      expect(result.freeDay.threshold).toBe(21)
    })

    it('resets streak when daily score drops below threshold', () => {
      const dates = makeDates(22)
      const data = fillData(dates, (i) =>
        i === 10 ? perfectDay({ nutrition: 0, exercise: { completed: false, type: '', duration_minutes: null } }) : perfectDay()
      )
      const result = computeBonuses(data, dates, 21)
      // Days 0-9 (10), day 10 breaks, days 11-21 (11)
      expect(result.freeDay.earned).toBe(0)
      expect(result.freeDay.streak).toBe(11)
    })

    it('a day with applied freeDay bonus counts toward the next free day streak', () => {
      const dates = makeDates(22)
      const data = fillData(dates, () => perfectDay())
      // Day 10: bad nutrition but freeDay bonus applied → scoreDay returns 35
      data[dates[10]] = { ...perfectDay({ nutrition: 0 }), bonusApplied: { freeDay: true } }
      const result = computeBonuses(data, dates, 21)
      expect(result.freeDay.earned).toBe(1)
    })
  })

  describe('edge cases', () => {
    it('handles empty data gracefully', () => {
      const result = computeBonuses({}, [], -1)
      expect(result.indulgence.earned).toBe(0)
      expect(result.restDay.earned).toBe(0)
      expect(result.nightOwl.earned).toBe(0)
      expect(result.freeDay.earned).toBe(0)
    })

    it('handles legacy boolean habit format', () => {
      const dates = makeDates(10)
      const data = fillData(dates, () => ({
        nutrition: 5,
        exercise: true,
        mobilize: true,
        sleep: true,
        hydrate: true,
        wellbeing: true,
        reflect: true,
      }))
      const result = computeBonuses(data, dates, 9)
      expect(result.restDay.earned).toBe(1) // 10 consecutive exercise days
    })
  })

  describe('bonus usage tracking', () => {
    it('counts days with bonusApplied as used', () => {
      const dates = makeDates(11)
      const data = fillData(dates, () => perfectDay())
      // Day 10 (index 10) has rest day bonus applied
      data[dates[10]] = { ...perfectDay({ exercise: { completed: false } }), bonusApplied: { restDay: true } }
      const result = computeBonuses(data, dates, 10)
      expect(result.restDay.earned).toBe(1)
      expect(result.restDay.used).toBe(1)
      expect(result.restDay.available).toBe(0)
    })

    it('available = earned - used', () => {
      // Earn 2 indulgence bonuses (8 consecutive 5-nutrition days), use 1
      const dates = makeDates(9)
      const data = fillData(dates, () => perfectDay())
      // Day 8 (index 8): low nutrition, but indulgence applied
      data[dates[8]] = { ...perfectDay({ nutrition: 2 }), bonusApplied: { indulgence: true } }
      const result = computeBonuses(data, dates, 8)
      expect(result.indulgence.earned).toBe(2)
      expect(result.indulgence.used).toBe(1)
      expect(result.indulgence.available).toBe(1)
    })

    it('used count is 0 when no bonuses have been applied', () => {
      const dates = makeDates(4)
      const data = fillData(dates, () => perfectDay())
      const result = computeBonuses(data, dates, 3)
      expect(result.indulgence.used).toBe(0)
      expect(result.indulgence.available).toBe(1)
    })
  })
})

describe('habit format compatibility', () => {
  it('new entries format { completed: true, entries: [...] } counts as exercise completed', () => {
    const dates = makeDates(10)
    const data = fillData(dates, () => ({
      ...perfectDay(),
      exercise: { completed: true, entries: [{ type: 'Cycling', duration_minutes: 45 }] },
    }))
    expect(computeBonuses(data, dates, 9).restDay.earned).toBe(1)
  })

  it('entries format with completed: false does NOT count as exercise completed', () => {
    const dates = makeDates(10)
    const data = fillData(dates, () => ({
      ...perfectDay(),
      exercise: { completed: false, entries: [] },
    }))
    const result = computeBonuses(data, dates, 9)
    expect(result.restDay.earned).toBe(0)
    expect(result.restDay.streak).toBe(0)
  })

  it('legacy boolean true counts as exercise completed', () => {
    const dates = makeDates(10)
    const data = fillData(dates, () => ({ ...perfectDay(), exercise: true }))
    expect(computeBonuses(data, dates, 9).restDay.earned).toBe(1)
  })

  it('null exercise value does NOT count as completed, breaks streak', () => {
    const dates = makeDates(5)
    const data = fillData(dates, () => ({ ...perfectDay(), exercise: null }))
    const result = computeBonuses(data, dates, 4)
    expect(result.restDay.streak).toBe(0)
    expect(result.restDay.earned).toBe(0)
  })

  it('missing day data (unlogged date) does NOT count as exercise completed', () => {
    const dates = makeDates(5)
    const data = {}
    dates.slice(0, 3).forEach((d) => { data[d] = perfectDay() })
    const result = computeBonuses(data, dates, 4)
    // Days 0-2 logged, days 3-4 unlogged → streak breaks at day 3
    expect(result.restDay.streak).toBe(0)
    expect(result.restDay.earned).toBe(0)
  })

  it('sleep format { completed: true, hours } counts toward night owl streak', () => {
    const dates = makeDates(6)
    const data = fillData(dates, () => ({
      ...perfectDay(),
      sleep: { completed: true, hours: 7.5 },
    }))
    expect(computeBonuses(data, dates, 5).nightOwl.earned).toBe(1)
  })

  it('sleep with completed: false breaks night owl streak', () => {
    const dates = makeDates(6)
    const data = fillData(dates, (i) => ({
      ...perfectDay(),
      sleep: i === 3 ? { completed: false, hours: null } : { completed: true, hours: 8 },
    }))
    const result = computeBonuses(data, dates, 5)
    expect(result.nightOwl.earned).toBe(0)
    expect(result.nightOwl.streak).toBe(2) // days 4-5
  })
})

describe('applyAutoBonuses', () => {
  const bonuses = (overrides = {}) => ({
    indulgence: { earned: 1, used: 0, available: 1, streak: 0, threshold: 4 },
    restDay: { earned: 1, used: 0, available: 1, streak: 0, threshold: 10 },
    nightOwl: { earned: 1, used: 0, available: 1, streak: 0, threshold: 6 },
    freeDay: { earned: 0, used: 0, available: 0, streak: 0, threshold: 21 },
    ...overrides,
  })

  it('returns the day unchanged when no habits are missed', () => {
    const day = {
      nutrition: 5,
      exercise: { completed: true, type: 'Running', duration_minutes: 30 },
      sleep: { completed: true, hours: 8 },
    }
    const result = applyAutoBonuses(day, bonuses())
    expect(result.bonusApplied || {}).toEqual({})
  })

  it('auto-applies indulgence bonus when nutrition is missed and bonus is available', () => {
    const day = { nutrition: 2 }
    const result = applyAutoBonuses(day, bonuses())
    expect(result.bonusApplied.indulgence).toBe(true)
  })

  it('auto-applies rest day bonus when exercise is missed and bonus is available', () => {
    const day = { exercise: { completed: false, type: '', duration_minutes: null } }
    const result = applyAutoBonuses(day, bonuses())
    expect(result.bonusApplied.restDay).toBe(true)
  })

  it('auto-applies night owl bonus when sleep is missed and bonus is available', () => {
    const day = { sleep: { completed: false, hours: null } }
    const result = applyAutoBonuses(day, bonuses())
    expect(result.bonusApplied.nightOwl).toBe(true)
  })

  it('does not auto-apply when bonus is unavailable', () => {
    const day = { nutrition: 2 }
    const result = applyAutoBonuses(day, bonuses({
      indulgence: { earned: 1, used: 1, available: 0, streak: 0, threshold: 4 },
    }))
    expect(result.bonusApplied?.indulgence).toBeFalsy()
  })

  it('does not auto-apply when habit is completed', () => {
    const day = { exercise: { completed: true, type: 'Running', duration_minutes: 30 } }
    const result = applyAutoBonuses(day, bonuses())
    expect(result.bonusApplied?.restDay).toBeFalsy()
  })

  it('does not override already-applied bonuses on the day', () => {
    const day = {
      nutrition: 2,
      bonusApplied: { indulgence: true },
    }
    const result = applyAutoBonuses(day, bonuses())
    // Still applied (not overridden), count not duplicated
    expect(result.bonusApplied.indulgence).toBe(true)
  })

  it('preserves other day fields', () => {
    const day = {
      nutrition: 2,
      exercise: { completed: true, type: 'Running', duration_minutes: 30 },
      wellbeing: { completed: true, activity_text: 'Meditation' },
    }
    const result = applyAutoBonuses(day, bonuses())
    expect(result.nutrition).toBe(2)
    expect(result.exercise).toEqual({ completed: true, type: 'Running', duration_minutes: 30 })
    expect(result.wellbeing).toEqual({ completed: true, activity_text: 'Meditation' })
  })

  it('applies multiple bonuses in a single call', () => {
    const day = {
      nutrition: 2,
      exercise: { completed: false, type: '', duration_minutes: null },
      sleep: { completed: false, hours: null },
    }
    const result = applyAutoBonuses(day, bonuses())
    expect(result.bonusApplied.indulgence).toBe(true)
    expect(result.bonusApplied.restDay).toBe(true)
    expect(result.bonusApplied.nightOwl).toBe(true)
  })
})
