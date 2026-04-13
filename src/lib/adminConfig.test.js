import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getConfig, setConfig, DEFAULT_CONFIG } from './adminConfig'

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
