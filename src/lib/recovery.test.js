import { describe, it, expect } from 'vitest'
import { calculateRecoveryScore, calculateStrainScore, getRecoveryTrend } from './recovery'

describe('calculateRecoveryScore', () => {
  it('returns 100 for perfect self-report values', () => {
    const score = calculateRecoveryScore({
      sleepQuality: 5,
      sleepHours: 9,   // 9h = max contribution (clamped range 5-9)
      energyLevel: 5,
      soreness: 1,     // 1 = no soreness (best)
      stressLevel: 1,  // 1 = no stress (best)
      mood: 5,
    })
    expect(score).toBe(100)
  })

  it('returns 0 for worst self-report values', () => {
    const score = calculateRecoveryScore({
      sleepQuality: 0,
      sleepHours: 0,   // clamps to 5, giving (5-5)/4 = 0
      energyLevel: 0,
      soreness: 5,     // 5 = very sore (worst)
      stressLevel: 5,  // 5 = very stressed (worst)
      mood: 0,
    })
    expect(score).toBe(0)
  })

  it('returns a mid-range score for average values', () => {
    const score = calculateRecoveryScore({
      sleepQuality: 3,
      sleepHours: 7,
      energyLevel: 3,
      soreness: 3,
      stressLevel: 3,
      mood: 3,
    })
    expect(score).toBeGreaterThan(30)
    expect(score).toBeLessThan(70)
  })

  it('clamps sleep hours contribution between 5 and 9', () => {
    const lowSleep = calculateRecoveryScore({
      sleepQuality: 5, sleepHours: 3, energyLevel: 5,
      soreness: 1, stressLevel: 1, mood: 5,
    })
    const minSleep = calculateRecoveryScore({
      sleepQuality: 5, sleepHours: 5, energyLevel: 5,
      soreness: 1, stressLevel: 1, mood: 5,
    })
    // 3 hours clamps to 5, so both should be the same
    expect(lowSleep).toBe(minSleep)

    const highSleep = calculateRecoveryScore({
      sleepQuality: 5, sleepHours: 12, energyLevel: 5,
      soreness: 1, stressLevel: 1, mood: 5,
    })
    const maxSleep = calculateRecoveryScore({
      sleepQuality: 5, sleepHours: 9, energyLevel: 5,
      soreness: 1, stressLevel: 1, mood: 5,
    })
    expect(highSleep).toBe(maxSleep)
  })

  it('returns null when no self-report data provided', () => {
    expect(calculateRecoveryScore(null)).toBeNull()
    expect(calculateRecoveryScore(undefined)).toBeNull()
    expect(calculateRecoveryScore({})).toBeNull()
  })

  it('returns null when data is incomplete (missing required fields)', () => {
    expect(calculateRecoveryScore({ sleepQuality: 5 })).toBeNull()
    expect(calculateRecoveryScore({ sleepQuality: 5, energyLevel: 3 })).toBeNull()
  })

  it('returns a rounded integer', () => {
    const score = calculateRecoveryScore({
      sleepQuality: 4, sleepHours: 7.5, energyLevel: 4,
      soreness: 2, stressLevel: 2, mood: 4,
    })
    expect(Number.isInteger(score)).toBe(true)
  })
})

describe('calculateStrainScore', () => {
  it('returns 0 when no exercise was done', () => {
    expect(calculateStrainScore(null, null)).toBe(0)
    expect(calculateStrainScore(
      { completed: false, type: '', duration_minutes: null },
      { completed: false, type: '', duration_minutes: null }
    )).toBe(0)
  })

  it('returns a positive score for completed exercise', () => {
    const score = calculateStrainScore(
      { completed: true, type: 'Running', duration_minutes: 30 },
      null
    )
    expect(score).toBeGreaterThan(0)
  })

  it('returns higher strain for longer duration', () => {
    const short = calculateStrainScore(
      { completed: true, type: 'Running', duration_minutes: 15 },
      null
    )
    const long = calculateStrainScore(
      { completed: true, type: 'Running', duration_minutes: 60 },
      null
    )
    expect(long).toBeGreaterThan(short)
  })

  it('returns higher strain for high-intensity types', () => {
    const yoga = calculateStrainScore(
      { completed: true, type: 'Yoga', duration_minutes: 30 },
      null
    )
    const hiit = calculateStrainScore(
      { completed: true, type: 'HIIT', duration_minutes: 30 },
      null
    )
    expect(hiit).toBeGreaterThan(yoga)
  })

  it('combines exercise and mobilize strain', () => {
    const exerciseOnly = calculateStrainScore(
      { completed: true, type: 'Running', duration_minutes: 30 },
      null
    )
    const both = calculateStrainScore(
      { completed: true, type: 'Running', duration_minutes: 30 },
      { completed: true, type: 'Yoga', duration_minutes: 20 }
    )
    expect(both).toBeGreaterThan(exerciseOnly)
  })

  it('caps strain at 21', () => {
    const score = calculateStrainScore(
      { completed: true, type: 'HIIT', duration_minutes: 480 },
      { completed: true, type: 'Running', duration_minutes: 480 }
    )
    expect(score).toBeLessThanOrEqual(21)
  })

  it('handles exercise without duration (legacy/no duration set)', () => {
    const score = calculateStrainScore(
      { completed: true, type: 'Running', duration_minutes: null },
      null
    )
    expect(score).toBe(0) // no duration = can't calculate strain
  })

  it('uses default intensity for unknown exercise types', () => {
    const score = calculateStrainScore(
      { completed: true, type: 'UnknownActivity', duration_minutes: 30 },
      null
    )
    expect(score).toBeGreaterThan(0)
  })
})

describe('getRecoveryTrend', () => {
  const makeDates = (n) => {
    const dates = []
    for (let i = 0; i < n; i++) {
      const d = new Date('2026-04-12')
      d.setDate(d.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }

  it('returns recovery and strain for each day with self-report data', () => {
    const dates = makeDates(3)
    const data = {
      [dates[0]]: {
        selfReport: { sleepQuality: 4, sleepHours: 7, energyLevel: 4, soreness: 2, stressLevel: 2, mood: 4 },
        exercise: { completed: true, type: 'Running', duration_minutes: 30 },
        mobilize: { completed: true, type: 'Yoga', duration_minutes: 15 },
      },
      [dates[1]]: {
        selfReport: { sleepQuality: 3, sleepHours: 6, energyLevel: 3, soreness: 3, stressLevel: 3, mood: 3 },
        exercise: { completed: true, type: 'Weights', duration_minutes: 45 },
      },
      [dates[2]]: {}, // no self-report
    }
    const result = getRecoveryTrend(data, dates, 2)
    expect(result).toHaveLength(3)
    expect(result[0]).toHaveProperty('day', 1)
    expect(result[0]).toHaveProperty('recovery')
    expect(result[0]).toHaveProperty('strain')
    expect(result[0].recovery).toBeGreaterThan(0)
    expect(result[0].strain).toBeGreaterThan(0)
    expect(result[2].recovery).toBeNull() // no self-report data
  })

  it('returns empty array when no data', () => {
    expect(getRecoveryTrend({}, [], -1)).toEqual([])
  })

  it('returns null recovery for days without self-report', () => {
    const dates = makeDates(1)
    const data = { [dates[0]]: { exercise: { completed: true, type: 'Running', duration_minutes: 30 } } }
    const result = getRecoveryTrend(data, dates, 0)
    expect(result[0].recovery).toBeNull()
    expect(result[0].strain).toBeGreaterThan(0)
  })
})
