import { describe, it, expect } from 'vitest'
import { migrateLegacyDay, migrateLegacyData } from './migration'

describe('migrateLegacyDay', () => {
  it('returns null for null/undefined input', () => {
    expect(migrateLegacyDay(null)).toBeNull()
    expect(migrateLegacyDay(undefined)).toBeNull()
  })

  it('passes through already-migrated data unchanged', () => {
    const migrated = {
      nutrition: 5,
      exercise: { completed: true, type: 'Running' },
      mobilize: { completed: true, type: 'Yoga' },
      sleep: { completed: true, hours: 8 },
      hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
      wellbeing: { completed: true, activity_text: 'Meditation' },
      reflect: { completed: true, reflection_text: 'Good day' },
    }
    const result = migrateLegacyDay(migrated)
    expect(result).toEqual(migrated)
  })

  it('converts boolean exercise=true to object format', () => {
    const legacy = { exercise: true }
    const result = migrateLegacyDay(legacy)
    expect(result.exercise).toEqual({ completed: true, type: 'Other' })
  })

  it('converts boolean exercise=false to object format', () => {
    const legacy = { exercise: false }
    const result = migrateLegacyDay(legacy)
    expect(result.exercise).toEqual({ completed: false, type: '' })
  })

  it('converts boolean mobilize to object format', () => {
    const legacy = { mobilize: true }
    const result = migrateLegacyDay(legacy)
    expect(result.mobilize).toEqual({ completed: true, type: 'Other' })
  })

  it('converts boolean sleep to object format', () => {
    const legacy = { sleep: true }
    const result = migrateLegacyDay(legacy)
    expect(result.sleep).toEqual({ completed: true, hours: null })
  })

  it('converts boolean hydrate to object with default target', () => {
    const legacy = { hydrate: true }
    const result = migrateLegacyDay(legacy, 2000)
    expect(result.hydrate).toEqual({ completed: true, current_ml: 2000, target_ml: 2000 })
  })

  it('converts boolean hydrate=false with zero progress', () => {
    const legacy = { hydrate: false }
    const result = migrateLegacyDay(legacy, 2000)
    expect(result.hydrate).toEqual({ completed: false, current_ml: 0, target_ml: 2000 })
  })

  it('converts boolean wellbeing to object format', () => {
    const legacy = { wellbeing: true }
    const result = migrateLegacyDay(legacy)
    expect(result.wellbeing).toEqual({ completed: true, activity_text: '' })
  })

  it('converts boolean reflect and carries reflection text', () => {
    const legacy = { reflect: true, reflection: 'Great day!' }
    const result = migrateLegacyDay(legacy)
    expect(result.reflect).toEqual({ completed: true, reflection_text: 'Great day!' })
  })

  it('preserves nutrition score unchanged', () => {
    const legacy = { nutrition: 3 }
    const result = migrateLegacyDay(legacy)
    expect(result.nutrition).toBe(3)
  })

  it('removes legacy reflection field after migration', () => {
    const legacy = { reflect: true, reflection: 'text' }
    const result = migrateLegacyDay(legacy)
    expect(result.reflection).toBeUndefined()
  })
})

describe('migrateLegacyData', () => {
  it('returns empty object for empty input', () => {
    expect(migrateLegacyData({})).toEqual({})
  })

  it('migrates all date entries', () => {
    const legacy = {
      '2026-04-11': { nutrition: 5, exercise: true, sleep: false, reflection: 'Day 1' },
      '2026-04-12': { nutrition: 4, exercise: false, reflect: true, reflection: 'Day 2' },
    }
    const result = migrateLegacyData(legacy, 2000)
    expect(result['2026-04-11'].exercise).toEqual({ completed: true, type: 'Other' })
    expect(result['2026-04-11'].sleep).toEqual({ completed: false, hours: null })
    expect(result['2026-04-12'].reflect).toEqual({ completed: true, reflection_text: 'Day 2' })
  })

  it('skips null entries', () => {
    const data = { '2026-04-11': null, '2026-04-12': { nutrition: 5 } }
    const result = migrateLegacyData(data)
    expect(result['2026-04-11']).toBeUndefined()
    expect(result['2026-04-12']).toBeDefined()
  })
})
