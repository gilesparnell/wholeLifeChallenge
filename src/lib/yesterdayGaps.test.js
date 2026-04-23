// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getYesterdayGaps } from './yesterdayGaps'

const fullDay = {
  nutrition: 5,
  exercise: { completed: true },
  mobilize: { completed: true },
  sleep: { completed: true },
  hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
  wellbeing: { completed: true },
  reflect: { completed: true },
  bonusApplied: {},
}

describe('getYesterdayGaps', () => {
  it('returns [] when yesterdayDayIndex < 0', () => {
    expect(getYesterdayGaps({}, '2026-04-12', -1)).toEqual([])
  })

  it('returns [] when no data entry for yesterday', () => {
    expect(getYesterdayGaps({}, '2026-04-12', 0)).toEqual([])
  })

  it('returns [] when all habits complete and nutrition is 5', () => {
    const data = { '2026-04-12': fullDay }
    expect(getYesterdayGaps(data, '2026-04-12', 0)).toEqual([])
  })

  it('returns [] when freeDay bonus applied', () => {
    const data = {
      '2026-04-12': {
        ...fullDay,
        exercise: { completed: false },
        bonusApplied: { freeDay: true },
      },
    }
    expect(getYesterdayGaps(data, '2026-04-12', 0)).toEqual([])
  })

  it('does not include exercise when restDay bonus covers it', () => {
    const data = {
      '2026-04-12': {
        ...fullDay,
        exercise: { completed: false },
        bonusApplied: { restDay: true },
      },
    }
    const gaps = getYesterdayGaps(data, '2026-04-12', 0)
    expect(gaps).not.toContain('exercise')
  })

  it('does not include sleep when nightOwl bonus covers it', () => {
    const data = {
      '2026-04-12': {
        ...fullDay,
        sleep: { completed: false },
        bonusApplied: { nightOwl: true },
      },
    }
    const gaps = getYesterdayGaps(data, '2026-04-12', 0)
    expect(gaps).not.toContain('sleep')
  })

  it('returns missed non-covered habits in a mixed day', () => {
    const data = {
      '2026-04-12': {
        ...fullDay,
        mobilize: { completed: false },
        wellbeing: { completed: false },
        bonusApplied: {},
      },
    }
    const gaps = getYesterdayGaps(data, '2026-04-12', 0)
    expect(gaps).toContain('mobilize')
    expect(gaps).toContain('wellbeing')
    expect(gaps).not.toContain('exercise')
    expect(gaps).not.toContain('sleep')
  })

  it('includes nutrition in gaps when nutrition < 5 and no indulgence', () => {
    const data = {
      '2026-04-12': { ...fullDay, nutrition: 3, bonusApplied: {} },
    }
    const gaps = getYesterdayGaps(data, '2026-04-12', 0)
    expect(gaps).toContain('nutrition')
  })

  it('does not include nutrition in gaps when indulgence bonus applied', () => {
    const data = {
      '2026-04-12': { ...fullDay, nutrition: 3, bonusApplied: { indulgence: true } },
    }
    const gaps = getYesterdayGaps(data, '2026-04-12', 0)
    expect(gaps).not.toContain('nutrition')
  })

  it('does not include nutrition in gaps when nutrition is 5', () => {
    const data = { '2026-04-12': { ...fullDay, nutrition: 5 } }
    expect(getYesterdayGaps(data, '2026-04-12', 0)).not.toContain('nutrition')
  })
})
