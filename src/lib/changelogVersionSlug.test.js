import { describe, it, expect } from 'vitest'
import { extractVersionSlug, extractVersionHeadingParts } from './changelogVersionSlug'

describe('extractVersionSlug', () => {
  it('returns the version from a single-version heading', () => {
    expect(extractVersionSlug('[0.16.0] — 21 Apr 2026 — Custom sleep hours + opt-in sharing')).toBe('0.16.0')
  })

  it('returns the LAST version from a range heading', () => {
    // The range represents "this is the final state shipped in this burst"
    expect(extractVersionSlug('[0.15.0 → 0.15.1] — 19 Apr 2026 — Edit past reflexions')).toBe('0.15.1')
    expect(extractVersionSlug('[0.14.0 → 0.14.4] — 19 Apr 2026 — Multi-activity exercise logging')).toBe('0.14.4')
  })

  it('handles an ASCII arrow in a range', () => {
    expect(extractVersionSlug('[0.10.0 -> 0.10.3] — something')).toBe('0.10.3')
  })

  it('returns null when no version-like token is present', () => {
    expect(extractVersionSlug('Conventions')).toBeNull()
    expect(extractVersionSlug('Some h2 without brackets')).toBeNull()
  })

  it('returns null for empty or non-string input', () => {
    expect(extractVersionSlug('')).toBeNull()
    expect(extractVersionSlug(null)).toBeNull()
    expect(extractVersionSlug(undefined)).toBeNull()
  })

  it('works on a bare [X.Y.Z] heading with no date or title', () => {
    expect(extractVersionSlug('[0.1.0]')).toBe('0.1.0')
  })
})

describe('extractVersionHeadingParts', () => {
  it('separates version, date, and title for a single-version heading', () => {
    expect(
      extractVersionHeadingParts('[0.16.0] — 21 Apr 2026 — Custom sleep hours + opt-in sharing'),
    ).toEqual({
      version: '0.16.0',
      range: '[0.16.0]',
      date: '21 Apr 2026',
      title: 'Custom sleep hours + opt-in sharing',
    })
  })

  it('separates version, date, and title for a range heading', () => {
    expect(
      extractVersionHeadingParts('[0.15.0 → 0.15.1] — 19 Apr 2026 — Edit past reflexions'),
    ).toEqual({
      version: '0.15.1',
      range: '[0.15.0 → 0.15.1]',
      date: '19 Apr 2026',
      title: 'Edit past reflexions',
    })
  })

  it('returns null for a heading that has no version token', () => {
    expect(extractVersionHeadingParts('Conventions')).toBeNull()
  })
})
