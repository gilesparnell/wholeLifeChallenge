import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getConfig,
  setConfig,
  DEFAULT_CONFIG,
  getEffectiveConfig,
  PERSONALISABLE_KEYS,
  sanitisePreferences,
} from './adminConfig'

// Mock localStorage since jsdom's implementation is limited
const store = {}
const mockLocalStorage = {
  getItem: vi.fn((key) => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = val }),
  removeItem: vi.fn((key) => { delete store[key] }),
}
Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true })

describe('DEFAULT_CONFIG', () => {
  it('has exercise types', () => {
    expect(DEFAULT_CONFIG.exerciseTypes).toBeInstanceOf(Array)
    expect(DEFAULT_CONFIG.exerciseTypes.length).toBeGreaterThan(0)
  })

  it('has mobilize types', () => {
    expect(DEFAULT_CONFIG.mobilizeTypes).toBeInstanceOf(Array)
    expect(DEFAULT_CONFIG.mobilizeTypes.length).toBeGreaterThan(0)
  })

  it('has a default hydration target in ml', () => {
    expect(DEFAULT_CONFIG.hydrationTargetMl).toBeGreaterThan(0)
  })

  it('has a default hydration increment in ml', () => {
    expect(DEFAULT_CONFIG.hydrationIncrementMl).toBe(250)
  })

  it('has a default challenge start date of 2026-04-13', () => {
    expect(DEFAULT_CONFIG.challengeStart).toBe('2026-04-13')
  })

  it('has a default challenge duration', () => {
    expect(DEFAULT_CONFIG.challengeDays).toBe(75)
  })

  it('has a default sleep target in hours', () => {
    expect(DEFAULT_CONFIG.sleepTargetHours).toBe(8)
  })
})

describe('PERSONALISABLE_KEYS', () => {
  it('exposes the keys a standard user can override', () => {
    expect(PERSONALISABLE_KEYS).toEqual([
      'hydrationTargetMl',
      'hydrationIncrementMl',
      'sleepTargetHours',
    ])
  })

  it('does not allow personalising global-only rules', () => {
    expect(PERSONALISABLE_KEYS).not.toContain('challengeStart')
    expect(PERSONALISABLE_KEYS).not.toContain('challengeDays')
    expect(PERSONALISABLE_KEYS).not.toContain('exerciseTypes')
    expect(PERSONALISABLE_KEYS).not.toContain('mobilizeTypes')
  })
})

describe('sanitisePreferences', () => {
  it('returns an empty object when given null', () => {
    expect(sanitisePreferences(null)).toEqual({})
  })

  it('returns an empty object when given undefined', () => {
    expect(sanitisePreferences(undefined)).toEqual({})
  })

  it('returns an empty object when given a non-object', () => {
    expect(sanitisePreferences('oops')).toEqual({})
    expect(sanitisePreferences(42)).toEqual({})
  })

  it('keeps only personalisable keys', () => {
    const result = sanitisePreferences({
      hydrationTargetMl: 2500,
      challengeDays: 999, // must be stripped
      exerciseTypes: ['cheat'], // must be stripped
    })
    expect(result).toEqual({ hydrationTargetMl: 2500 })
  })

  it('coerces numeric fields to numbers', () => {
    const result = sanitisePreferences({
      hydrationTargetMl: '2500',
      hydrationIncrementMl: '500',
      sleepTargetHours: '7.5',
    })
    expect(result.hydrationTargetMl).toBe(2500)
    expect(result.hydrationIncrementMl).toBe(500)
    expect(result.sleepTargetHours).toBe(7.5)
  })

  it('drops values that fail range checks', () => {
    const result = sanitisePreferences({
      hydrationTargetMl: 50, // below min 500
      hydrationIncrementMl: 5000, // above max 1000
      sleepTargetHours: 30, // above max 14
    })
    expect(result).toEqual({})
  })

  it('keeps values at the edges of the valid range', () => {
    const result = sanitisePreferences({
      hydrationTargetMl: 500,
      hydrationIncrementMl: 100,
      sleepTargetHours: 4,
    })
    expect(result.hydrationTargetMl).toBe(500)
    expect(result.hydrationIncrementMl).toBe(100)
    expect(result.sleepTargetHours).toBe(4)
  })

  it('drops NaN values silently', () => {
    expect(sanitisePreferences({ hydrationTargetMl: 'banana' })).toEqual({})
  })
})

describe('getEffectiveConfig', () => {
  beforeEach(() => {
    delete store['wlc-admin-config']
  })

  it('returns the global config when given a null profile', () => {
    const config = getEffectiveConfig(null)
    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it('returns the global config when given an undefined profile', () => {
    expect(getEffectiveConfig()).toEqual(DEFAULT_CONFIG)
    expect(getEffectiveConfig(undefined)).toEqual(DEFAULT_CONFIG)
  })

  it('returns the global config when profile has no preferences', () => {
    const profile = { id: 'u1', role: 'user' }
    expect(getEffectiveConfig(profile)).toEqual(DEFAULT_CONFIG)
  })

  it('returns the global config when profile.preferences is an empty object', () => {
    const profile = { id: 'u1', preferences: {} }
    expect(getEffectiveConfig(profile)).toEqual(DEFAULT_CONFIG)
  })

  it('overlays personalisable preferences onto the global config', () => {
    const profile = {
      id: 'u1',
      preferences: { hydrationTargetMl: 2000, sleepTargetHours: 7 },
    }
    const config = getEffectiveConfig(profile)
    expect(config.hydrationTargetMl).toBe(2000)
    expect(config.sleepTargetHours).toBe(7)
    // non-overridden keys still from global
    expect(config.exerciseTypes).toEqual(DEFAULT_CONFIG.exerciseTypes)
    expect(config.challengeDays).toBe(DEFAULT_CONFIG.challengeDays)
  })

  it('reads the current global config, not just defaults', () => {
    setConfig({ ...DEFAULT_CONFIG, hydrationTargetMl: 3000, challengeDays: 42 })
    const profile = { preferences: { hydrationTargetMl: 2000 } }
    const config = getEffectiveConfig(profile)
    expect(config.hydrationTargetMl).toBe(2000) // user override wins
    expect(config.challengeDays).toBe(42) // admin change respected
  })

  it('refuses to allow users to override non-personalisable keys', () => {
    const profile = {
      preferences: {
        hydrationTargetMl: 2000,
        challengeDays: 1, // attempted override
        exerciseTypes: ['only me'], // attempted override
      },
    }
    const config = getEffectiveConfig(profile)
    expect(config.hydrationTargetMl).toBe(2000)
    expect(config.challengeDays).toBe(DEFAULT_CONFIG.challengeDays)
    expect(config.exerciseTypes).toEqual(DEFAULT_CONFIG.exerciseTypes)
  })

  it('tolerates garbage preferences without throwing', () => {
    expect(() => getEffectiveConfig({ preferences: 'nope' })).not.toThrow()
    expect(getEffectiveConfig({ preferences: 'nope' })).toEqual(DEFAULT_CONFIG)
  })
})

describe('getConfig', () => {
  beforeEach(() => {
    delete store['wlc-admin-config']
  })

  it('returns default config when nothing is stored', () => {
    const config = getConfig()
    expect(config).toEqual(DEFAULT_CONFIG)
  })

  it('returns stored config when present', () => {
    const custom = { ...DEFAULT_CONFIG, exerciseTypes: ['Running', 'Cycling'] }
    localStorage.setItem('wlc-admin-config', JSON.stringify(custom))
    const config = getConfig()
    expect(config.exerciseTypes).toEqual(['Running', 'Cycling'])
  })

  it('merges with defaults for missing keys', () => {
    localStorage.setItem('wlc-admin-config', JSON.stringify({ exerciseTypes: ['Yoga'] }))
    const config = getConfig()
    expect(config.exerciseTypes).toEqual(['Yoga'])
    expect(config.mobilizeTypes).toEqual(DEFAULT_CONFIG.mobilizeTypes)
    expect(config.hydrationTargetMl).toBe(DEFAULT_CONFIG.hydrationTargetMl)
  })
})

describe('setConfig', () => {
  beforeEach(() => {
    delete store['wlc-admin-config']
  })

  it('persists config to localStorage', () => {
    const custom = { ...DEFAULT_CONFIG, hydrationTargetMl: 3000 }
    setConfig(custom)
    const stored = JSON.parse(localStorage.getItem('wlc-admin-config'))
    expect(stored.hydrationTargetMl).toBe(3000)
  })

  it('can be retrieved after setting', () => {
    setConfig({ ...DEFAULT_CONFIG, exerciseTypes: ['Swimming'] })
    expect(getConfig().exerciseTypes).toEqual(['Swimming'])
  })
})
