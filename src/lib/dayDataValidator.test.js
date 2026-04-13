import { describe, it, expect } from 'vitest'
import { validateDayData, NUTRITION_MIN, NUTRITION_MAX, SLEEP_HOURS_MAX } from './dayDataValidator'

describe('validateDayData', () => {
  it('accepts a fully valid day', () => {
    const result = validateDayData({
      nutrition: 4,
      exercise: { completed: true, type: 'Running' },
      mobilize: { completed: true, type: 'Yoga' },
      sleep: { completed: true, hours: 7.5 },
      hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
      wellbeing: { completed: true, activity_text: 'Meditation' },
      reflect: { completed: true, reflection_text: 'Solid' },
    })
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('accepts an empty day data object (nothing to validate yet)', () => {
    const result = validateDayData({})
    expect(result.valid).toBe(true)
  })

  it('rejects null dayData', () => {
    const result = validateDayData(null)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('rejects undefined dayData', () => {
    const result = validateDayData(undefined)
    expect(result.valid).toBe(false)
  })

  describe('nutrition', () => {
    it(`accepts the lower bound (${NUTRITION_MIN})`, () => {
      expect(validateDayData({ nutrition: NUTRITION_MIN }).valid).toBe(true)
    })

    it(`accepts the upper bound (${NUTRITION_MAX})`, () => {
      expect(validateDayData({ nutrition: NUTRITION_MAX }).valid).toBe(true)
    })

    it('rejects a value above the max (the example from the plan: 99)', () => {
      const result = validateDayData({ nutrition: 99 })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => /nutrition/i.test(e))).toBe(true)
    })

    it('rejects a negative value', () => {
      const result = validateDayData({ nutrition: -1 })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => /nutrition/i.test(e))).toBe(true)
    })

    it('rejects a non-numeric value', () => {
      const result = validateDayData({ nutrition: 'four' })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => /nutrition/i.test(e))).toBe(true)
    })

    it('rejects NaN', () => {
      const result = validateDayData({ nutrition: NaN })
      expect(result.valid).toBe(false)
    })

    it('rejects Infinity', () => {
      const result = validateDayData({ nutrition: Infinity })
      expect(result.valid).toBe(false)
    })

    it('allows nutrition to be absent', () => {
      expect(validateDayData({ exercise: { completed: false } }).valid).toBe(true)
    })

    it('allows nutrition to be null', () => {
      expect(validateDayData({ nutrition: null }).valid).toBe(true)
    })
  })

  describe('sleep.hours', () => {
    it('accepts a normal value', () => {
      expect(validateDayData({ sleep: { completed: true, hours: 8 } }).valid).toBe(true)
    })

    it('accepts the lower bound (0)', () => {
      expect(validateDayData({ sleep: { completed: false, hours: 0 } }).valid).toBe(true)
    })

    it(`accepts the upper bound (${SLEEP_HOURS_MAX})`, () => {
      expect(validateDayData({ sleep: { completed: true, hours: SLEEP_HOURS_MAX } }).valid).toBe(true)
    })

    it('rejects more than 24 hours', () => {
      const result = validateDayData({ sleep: { completed: true, hours: 25 } })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => /sleep/i.test(e))).toBe(true)
    })

    it('rejects negative hours', () => {
      const result = validateDayData({ sleep: { completed: false, hours: -2 } })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => /sleep/i.test(e))).toBe(true)
    })

    it('rejects non-numeric hours', () => {
      const result = validateDayData({ sleep: { completed: true, hours: 'eight' } })
      expect(result.valid).toBe(false)
    })

    it('allows sleep without an hours field', () => {
      expect(validateDayData({ sleep: { completed: false } }).valid).toBe(true)
    })

    it('allows sleep.hours to be null', () => {
      expect(validateDayData({ sleep: { completed: false, hours: null } }).valid).toBe(true)
    })
  })

  describe('hydrate.current_ml', () => {
    it('accepts a normal value', () => {
      expect(validateDayData({ hydrate: { completed: true, current_ml: 2000, target_ml: 2000 } }).valid).toBe(true)
    })

    it('accepts zero (no water yet)', () => {
      expect(validateDayData({ hydrate: { completed: false, current_ml: 0, target_ml: 2000 } }).valid).toBe(true)
    })

    it('rejects a negative current_ml', () => {
      const result = validateDayData({ hydrate: { completed: false, current_ml: -100, target_ml: 2000 } })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => /hydrate/i.test(e))).toBe(true)
    })

    it('rejects a negative target_ml', () => {
      const result = validateDayData({ hydrate: { completed: false, current_ml: 0, target_ml: -1 } })
      expect(result.valid).toBe(false)
      expect(result.errors.some((e) => /hydrate/i.test(e))).toBe(true)
    })

    it('rejects non-numeric current_ml', () => {
      const result = validateDayData({ hydrate: { current_ml: 'lots', target_ml: 2000 } })
      expect(result.valid).toBe(false)
    })

    it('allows hydrate without ml fields', () => {
      expect(validateDayData({ hydrate: { completed: true } }).valid).toBe(true)
    })
  })

  it('reports multiple errors at once', () => {
    const result = validateDayData({
      nutrition: 99,
      sleep: { hours: 30 },
      hydrate: { current_ml: -1, target_ml: 2000 },
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })
})
