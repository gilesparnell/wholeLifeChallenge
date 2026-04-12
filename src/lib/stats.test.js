import { describe, it, expect } from 'vitest'
import { calculateTotalScore, calculateMaxPossible, calculateRate, truncatePreview } from './stats'

const perfectDay = {
  nutrition: 5,
  exercise: { completed: true, type: 'Running', duration_minutes: 30 },
  mobilize: { completed: true, type: 'Yoga', duration_minutes: 15 },
  sleep: { completed: true, hours: 8 },
  hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
  wellbeing: { completed: true, activity_text: 'Meditation' },
  reflect: { completed: true, reflection_text: 'Good day' },
}

const makeDates = (n) => {
  const dates = []
  for (let i = 0; i < n; i++) {
    const d = new Date('2026-04-12')
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

describe('calculateTotalScore', () => {
  it('returns 0 when no data exists', () => {
    const dates = makeDates(5)
    expect(calculateTotalScore({}, dates, 2)).toBe(0)
  })

  it('sums scores for days up to and including today (dayIndex)', () => {
    const dates = makeDates(5)
    const data = {
      [dates[0]]: perfectDay, // day 1
      [dates[1]]: perfectDay, // day 2
      [dates[2]]: perfectDay, // day 3 (today)
      [dates[3]]: perfectDay, // day 4 (future — should be excluded)
      [dates[4]]: perfectDay, // day 5 (future — should be excluded)
    }
    expect(calculateTotalScore(data, dates, 2)).toBe(105) // 3 × 35
  })

  it('excludes data for future days (sample data pollution)', () => {
    const dates = makeDates(5)
    const data = {
      [dates[0]]: perfectDay,
      [dates[3]]: perfectDay, // future
    }
    expect(calculateTotalScore(data, dates, 1)).toBe(35) // only day 1 counts
  })

  it('handles partial scores correctly', () => {
    const dates = makeDates(3)
    const data = {
      [dates[0]]: { nutrition: 3 }, // score 3
      [dates[1]]: { nutrition: 5, exercise: { completed: true } }, // score 10
      [dates[2]]: perfectDay, // score 35
    }
    expect(calculateTotalScore(data, dates, 2)).toBe(48)
  })

  it('ignores data for dates not in allDates (before challenge start)', () => {
    const dates = makeDates(3)
    const data = {
      '2026-04-10': perfectDay, // before challenge
      [dates[0]]: perfectDay,
    }
    expect(calculateTotalScore(data, dates, 0)).toBe(35)
  })

  it('returns 0 when dayIndex is negative (challenge not started)', () => {
    const dates = makeDates(3)
    const data = { [dates[0]]: perfectDay }
    expect(calculateTotalScore(data, dates, -1)).toBe(0)
  })
})

describe('calculateMaxPossible', () => {
  it('returns 35 for day 1 (dayIndex 0)', () => {
    expect(calculateMaxPossible(0, 75)).toBe(35)
  })

  it('returns (dayIndex + 1) * 35 for days within the challenge', () => {
    expect(calculateMaxPossible(4, 75)).toBe(5 * 35) // day 5 → 175
    expect(calculateMaxPossible(9, 75)).toBe(10 * 35) // day 10 → 350
  })

  it('caps at challengeDays * 35', () => {
    expect(calculateMaxPossible(100, 75)).toBe(75 * 35) // 2625
  })

  it('returns 0 when dayIndex is negative (challenge not started)', () => {
    expect(calculateMaxPossible(-1, 75)).toBe(0)
  })
})

describe('calculateRate', () => {
  it('returns 0 when maxPossible is 0', () => {
    expect(calculateRate(0, 0)).toBe(0)
  })

  it('returns 100 for a perfect score', () => {
    expect(calculateRate(35, 35)).toBe(100)
  })

  it('returns 50 for half the maximum', () => {
    expect(calculateRate(70, 140)).toBe(50)
  })

  it('rounds to nearest integer', () => {
    expect(calculateRate(1, 3)).toBe(33)
    expect(calculateRate(2, 3)).toBe(67)
  })

  it('caps at 100 (should never exceed)', () => {
    // Defensive — totalScore should never exceed maxPossible when both are calculated correctly
    expect(calculateRate(200, 100)).toBe(100)
  })
})

describe('truncatePreview', () => {
  it('returns empty string for null/undefined/empty input', () => {
    expect(truncatePreview(null)).toBe('')
    expect(truncatePreview(undefined)).toBe('')
    expect(truncatePreview('')).toBe('')
  })

  it('returns the string unchanged when under the limit', () => {
    expect(truncatePreview('Hello world', 40)).toBe('Hello world')
  })

  it('truncates and appends ellipsis when over the limit', () => {
    const long = 'This is a very long piece of text that goes beyond forty characters'
    const result = truncatePreview(long, 40)
    expect(result).toBe('This is a very long piece of text that g\u2026')
    expect(result.length).toBeLessThanOrEqual(41) // 40 chars + ellipsis
  })

  it('takes only the first line if text has newlines', () => {
    const multiline = 'First line of text\nSecond line\nThird line'
    expect(truncatePreview(multiline, 40)).toBe('First line of text')
  })

  it('truncates first line if it exceeds the limit', () => {
    const longFirstLine = 'This first line is also incredibly long and needs to be trimmed\nsecond line'
    const result = truncatePreview(longFirstLine, 40)
    expect(result).toBe('This first line is also incredibly long\u2026')
  })

  it('uses default limit of 40 when not specified', () => {
    expect(truncatePreview('a'.repeat(50))).toBe('a'.repeat(40) + '\u2026')
  })

  it('trims whitespace from the result', () => {
    expect(truncatePreview('   Hello world   ')).toBe('Hello world')
  })
})
