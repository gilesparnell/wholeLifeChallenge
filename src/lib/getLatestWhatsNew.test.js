import { describe, it, expect } from 'vitest'
import { getLatestWhatsNew } from './getLatestWhatsNew'

const CHANGELOG_SAMPLE = `# Changelog

Some intro paragraph.

## Conventions

### Versioning

- patch
- minor

---

## [0.17.0] — 22 Apr 2026 — Exercise sharing

### What's new

- Share your exercise and mobility activity.
- Exercise insights appear inline.
- Nutrition remains private.

### Under the hood

- Dev detail 1.
- Dev detail 2.

---

## [0.16.0] — 21 Apr 2026 — Older

### What's new

- Older bullet.
`

describe('getLatestWhatsNew', () => {
  it('returns the first versioned entry after the h1 + Conventions, skipping Conventions', () => {
    const result = getLatestWhatsNew(CHANGELOG_SAMPLE)
    expect(result).not.toBeNull()
    expect(result.version).toBe('0.17.0')
  })

  it('returns only "What\'s new" bullets, not "Under the hood"', () => {
    const result = getLatestWhatsNew(CHANGELOG_SAMPLE)
    expect(result.items).toEqual([
      'Share your exercise and mobility activity.',
      'Exercise insights appear inline.',
      'Nutrition remains private.',
    ])
    expect(result.items).not.toContain('Dev detail 1.')
  })

  it('caps the bullets at maxItems (default 3)', () => {
    const many = `## [0.1.0] — today — Long

### What's new

- One.
- Two.
- Three.
- Four.
- Five.
`
    const result = getLatestWhatsNew(many)
    expect(result.items.length).toBe(3)
  })

  it('respects a custom maxItems', () => {
    const many = `## [0.1.0] — today — Long

### What's new

- One.
- Two.
- Three.
- Four.
- Five.
`
    const result = getLatestWhatsNew(many, { maxItems: 2 })
    expect(result.items.length).toBe(2)
  })

  it('indicates truncation via hasMore when more bullets exist than maxItems', () => {
    const many = `## [0.1.0] — today — Long

### What's new

- One.
- Two.
- Three.
- Four.
`
    const result = getLatestWhatsNew(many, { maxItems: 3 })
    expect(result.hasMore).toBe(true)
  })

  it('hasMore is false when the items fit within maxItems', () => {
    const result = getLatestWhatsNew(CHANGELOG_SAMPLE, { maxItems: 10 })
    expect(result.hasMore).toBe(false)
  })

  it('returns null when there is no versioned entry', () => {
    const noVersions = `# Changelog

Intro.

## Conventions

- foo
`
    expect(getLatestWhatsNew(noVersions)).toBeNull()
  })

  it('returns null on empty or garbage input', () => {
    expect(getLatestWhatsNew('')).toBeNull()
    expect(getLatestWhatsNew(null)).toBeNull()
    expect(getLatestWhatsNew(undefined)).toBeNull()
  })

  it('returns empty items (not null) when an entry has no What\'s new section', () => {
    const onlyUnderTheHood = `## [0.1.0] — today — X

### Under the hood

- Dev.
`
    const result = getLatestWhatsNew(onlyUnderTheHood)
    expect(result).not.toBeNull()
    expect(result.version).toBe('0.1.0')
    expect(result.items).toEqual([])
  })

  it('exposes the version title', () => {
    expect(getLatestWhatsNew(CHANGELOG_SAMPLE).title).toBe('Exercise sharing')
  })
})
