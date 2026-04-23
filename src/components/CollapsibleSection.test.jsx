import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readSectionOpen, writeSectionOpen, lsKey } from './CollapsibleSection'

const ID = 'test-section'

let store = {}
const fakeStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v) },
  removeItem: (k) => { delete store[k] },
}
vi.stubGlobal('localStorage', fakeStorage)

beforeEach(() => {
  store = {}
})

describe('lsKey', () => {
  it('namespaces the key to avoid clashing with other localStorage entries', () => {
    expect(lsKey('foo')).toBe('wlc-progress-open-foo')
  })
})

describe('readSectionOpen', () => {
  it('returns defaultOpen when nothing is stored', () => {
    expect(readSectionOpen(ID, true)).toBe(true)
    expect(readSectionOpen(ID, false)).toBe(false)
  })

  it('returns true when stored value is "1"', () => {
    localStorage.setItem(lsKey(ID), '1')
    expect(readSectionOpen(ID, false)).toBe(true)
  })

  it('returns false when stored value is "0"', () => {
    localStorage.setItem(lsKey(ID), '0')
    expect(readSectionOpen(ID, true)).toBe(false)
  })

  it('falls back to defaultOpen when stored value is unrecognised', () => {
    localStorage.setItem(lsKey(ID), 'corrupt')
    expect(readSectionOpen(ID, true)).toBe(true)
    expect(readSectionOpen(ID, false)).toBe(false)
  })
})

describe('writeSectionOpen', () => {
  it('writes "1" when isOpen is true', () => {
    writeSectionOpen(ID, true)
    expect(localStorage.getItem(lsKey(ID))).toBe('1')
  })

  it('writes "0" when isOpen is false', () => {
    writeSectionOpen(ID, false)
    expect(localStorage.getItem(lsKey(ID))).toBe('0')
  })

  it('overwrites a previously stored value', () => {
    writeSectionOpen(ID, true)
    writeSectionOpen(ID, false)
    expect(localStorage.getItem(lsKey(ID))).toBe('0')
  })
})
