// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildQueryContext } from './queryContext'

// FALLBACK_START = '2026-04-13' in node env (no localStorage)
const makeDates = (n) => {
  const dates = []
  for (let i = 0; i < n; i++) {
    const d = new Date('2026-04-13T00:00:00')
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

const DATES = makeDates(75)

const perfectDay = {
  nutrition: 5,
  exercise: { completed: true },
  mobilize: { completed: true },
  sleep: { completed: true },
  hydrate: { completed: true },
  wellbeing: { completed: true },
  reflect: { completed: true },
}

describe('buildQueryContext', () => {
  it('returns a non-empty string', () => {
    const result = buildQueryContext({}, DATES, 0, 75)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes the correct challenge day number', () => {
    const result = buildQueryContext({}, DATES, 4, 75) // day index 4 = day 5
    expect(result).toContain('Day 5 of 75')
  })

  it('includes total score and max possible', () => {
    const data = { [DATES[0]]: { nutrition: 5 }, [DATES[1]]: { nutrition: 3 } }
    const result = buildQueryContext(data, DATES, 1, 75)
    expect(result).toContain('8/70') // 5+3 out of 2*35
  })

  it('includes days elapsed and days logged', () => {
    const data = { [DATES[0]]: perfectDay } // only day 0 logged, but we're on day 2
    const result = buildQueryContext(data, DATES, 2, 75)
    expect(result).toContain('3') // 3 days elapsed
    expect(result).toContain('1') // 1 day logged
  })

  it('includes streak count', () => {
    const data = {
      [DATES[0]]: perfectDay,
      [DATES[1]]: perfectDay,
    }
    const result = buildQueryContext(data, DATES, 1, 75)
    expect(result).toContain('2') // streak of 2
  })

  it('includes per-habit breakdown', () => {
    const data = {
      [DATES[0]]: { nutrition: 4, exercise: { completed: true }, mobilize: { completed: false } },
    }
    const result = buildQueryContext(data, DATES, 0, 75)
    expect(result).toContain('Exercise')
    expect(result).toContain('Mobilize')
    expect(result).toContain('Nutrition')
  })

  it('handles empty data without throwing', () => {
    expect(() => buildQueryContext({}, DATES, 10, 75)).not.toThrow()
    const result = buildQueryContext({}, DATES, 10, 75)
    expect(result).toContain('0/') // zero score
  })

  it('handles dayIndex 0 (first day of challenge)', () => {
    const result = buildQueryContext({}, DATES, 0, 75)
    expect(result).toContain('Day 1 of 75')
  })

  it('includes today score for the current day', () => {
    const data = { [DATES[2]]: { nutrition: 3 } }
    const result = buildQueryContext(data, DATES, 2, 75)
    expect(result).toContain('3/35') // today's score
  })
})
