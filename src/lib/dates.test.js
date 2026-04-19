// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getDayIndex, formatDate, getToday, getAllDates, CHALLENGE_START, CHALLENGE_DAYS } from './dates'

describe('CHALLENGE_START', () => {
  it('is 2026-04-13 (the real challenge start date)', () => {
    expect(CHALLENGE_START).toBe('2026-04-13')
  })
})

describe('CHALLENGE_DAYS', () => {
  it('is 75', () => {
    expect(CHALLENGE_DAYS).toBe(75)
  })
})

describe('getDayIndex', () => {
  it('returns 0 for the challenge start date (2026-04-13)', () => {
    expect(getDayIndex('2026-04-13')).toBe(0)
  })

  it('returns 1 for the day after start', () => {
    expect(getDayIndex('2026-04-14')).toBe(1)
  })

  it('returns 74 for the last day of the 75-day challenge (2026-06-26)', () => {
    expect(getDayIndex('2026-06-26')).toBe(74)
  })

  it('returns negative for dates before the challenge', () => {
    expect(getDayIndex('2026-04-12')).toBe(-1)
  })

  it('returns > 74 for dates after the challenge', () => {
    expect(getDayIndex('2026-06-27')).toBe(75)
  })
})

describe('formatDate', () => {
  it('formats a date as readable string', () => {
    const result = formatDate('2026-04-13')
    expect(result).toMatch(/Mon/)
    expect(result).toMatch(/Apr/)
    expect(result).toMatch(/13/)
  })
})

describe('getToday', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    const today = getToday()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getAllDates', () => {
  it('returns 75 dates', () => {
    const dates = getAllDates()
    expect(dates).toHaveLength(75)
  })

  it('starts with the challenge start date (2026-04-13)', () => {
    const dates = getAllDates()
    expect(dates[0]).toBe('2026-04-13')
  })

  it('ends 74 days later (2026-06-26)', () => {
    const dates = getAllDates()
    expect(dates[74]).toBe('2026-06-26')
  })

  it('has consecutive dates with no gaps', () => {
    const dates = getAllDates()
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + 'T00:00:00')
      const curr = new Date(dates[i] + 'T00:00:00')
      const diffDays = (curr - prev) / 86400000
      expect(diffDays).toBe(1)
    }
  })

  it('all dates match YYYY-MM-DD format', () => {
    const dates = getAllDates()
    dates.forEach(d => {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })
})
