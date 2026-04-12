import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadAll, saveDay, clearAll, DATA_KEY } from './dataStore'

describe('dataStore', () => {
  beforeEach(() => {
    const store = {}
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => store[key] ?? null),
      setItem: vi.fn((key, val) => { store[key] = val }),
      removeItem: vi.fn((key) => { delete store[key] }),
    })
  })

  // --- loadAll ---
  it('returns empty object when nothing stored', () => {
    expect(loadAll()).toEqual({})
  })

  it('returns parsed data from localStorage', () => {
    const data = { '2026-04-11': { nutrition: 5 } }
    localStorage.setItem(DATA_KEY, JSON.stringify(data))
    expect(loadAll()).toEqual(data)
  })

  it('returns empty object on corrupted JSON', () => {
    localStorage.setItem(DATA_KEY, '{broken')
    expect(loadAll()).toEqual({})
  })

  // --- saveDay ---
  it('saves a single day entry into existing data', () => {
    const existing = { '2026-04-11': { nutrition: 3 } }
    localStorage.setItem(DATA_KEY, JSON.stringify(existing))

    const dayData = { nutrition: 5, exercise: { completed: true, type: 'Running' } }
    const result = saveDay('2026-04-12', dayData)

    expect(result['2026-04-11']).toEqual({ nutrition: 3 })
    expect(result['2026-04-12']).toEqual(dayData)
    expect(JSON.parse(localStorage.setItem.mock.calls.at(-1)[1])).toEqual(result)
  })

  it('overwrites existing day data', () => {
    const existing = { '2026-04-11': { nutrition: 3 } }
    localStorage.setItem(DATA_KEY, JSON.stringify(existing))

    const updated = { nutrition: 5 }
    const result = saveDay('2026-04-11', updated)
    expect(result['2026-04-11']).toEqual({ nutrition: 5 })
  })

  it('creates new data when none exists', () => {
    const dayData = { nutrition: 4 }
    const result = saveDay('2026-04-11', dayData)
    expect(result).toEqual({ '2026-04-11': { nutrition: 4 } })
  })

  // --- clearAll ---
  it('removes data from localStorage', () => {
    localStorage.setItem(DATA_KEY, '{"foo":"bar"}')
    clearAll()
    expect(localStorage.removeItem).toHaveBeenCalledWith(DATA_KEY)
  })
})
