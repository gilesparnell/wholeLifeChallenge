import { describe, it, expect } from 'vitest'
import { getDayIndex, formatDate, getToday, getAllDates, CHALLENGE_START, CHALLENGE_DAYS } from './dates'

describe('CHALLENGE_START', () => {
  it('is 2026-04-12', () => {
    expect(CHALLENGE_START).toBe('2026-04-12')
  })
})

describe('CHALLENGE_DAYS', () => {
  it('is 75', () => {
    expect(CHALLENGE_DAYS).toBe(75)
  })
})

describe('getDayIndex', () => {
  it('returns 0 for the challenge start date', () => {
    expect(getDayIndex('2026-04-12')).toBe(0)
  })

  it('returns 1 for the day after start', () => {
    expect(getDayIndex('2026-04-13')).toBe(1)
  })

  it('returns 74 for the last day of the challenge', () => {
    expect(getDayIndex('2026-06-25')).toBe(74)
  })

  it('returns negative for dates before the challenge', () => {
    expect(getDayIndex('2026-04-11')).toBe(-1)
  })

  it('returns > 74 for dates after the challenge', () => {
    expect(getDayIndex('2026-06-26')).toBe(75)
  })
})

describe('formatDate', () => {
  it('formats a date as readable string', () => {
    const result = formatDate('2026-04-12')
    expect(result).toMatch(/Sun/)
    expect(result).toMatch(/Apr/)
    expect(result).toMatch(/12/)
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

  it('starts with the challenge start date', () => {
    const dates = getAllDates()
    expect(dates[0]).toBe('2026-04-12')
  })

  it('ends with the challenge end date', () => {
    const dates = getAllDates()
    expect(dates[74]).toBe('2026-06-25')
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
