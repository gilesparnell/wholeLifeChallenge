import { describe, it, expect } from 'vitest'
import { parseChangelog } from './parseChangelog'

describe('parseChangelog', () => {
  it('returns an empty array for empty input', () => {
    expect(parseChangelog('')).toEqual([])
  })

  it('returns an empty array for null/undefined', () => {
    expect(parseChangelog(null)).toEqual([])
    expect(parseChangelog(undefined)).toEqual([])
  })

  it('parses a single h1', () => {
    const blocks = parseChangelog('# Changelog')
    expect(blocks).toEqual([{ type: 'h1', text: 'Changelog' }])
  })

  it('parses a single h2', () => {
    const blocks = parseChangelog('## [0.9.6] — 2026-04-13')
    expect(blocks).toEqual([{ type: 'h2', text: '[0.9.6] — 2026-04-13' }])
  })

  it('parses a single h3', () => {
    const blocks = parseChangelog('### Fixed')
    expect(blocks).toEqual([{ type: 'h3', text: 'Fixed' }])
  })

  it('parses a horizontal rule', () => {
    const blocks = parseChangelog('---')
    expect(blocks).toEqual([{ type: 'hr' }])
  })

  it('parses a single bullet into a list', () => {
    const blocks = parseChangelog('- one thing')
    expect(blocks).toEqual([{ type: 'ul', items: ['one thing'] }])
  })

  it('groups consecutive bullets into one list', () => {
    const blocks = parseChangelog('- first\n- second\n- third')
    expect(blocks).toEqual([
      { type: 'ul', items: ['first', 'second', 'third'] },
    ])
  })

  it('splits bullet groups separated by a blank line into separate lists', () => {
    const blocks = parseChangelog('- a\n\n- b')
    expect(blocks).toEqual([
      { type: 'ul', items: ['a'] },
      { type: 'ul', items: ['b'] },
    ])
  })

  it('parses a paragraph of plain text', () => {
    const blocks = parseChangelog('Just some words on a line.')
    expect(blocks).toEqual([{ type: 'p', text: 'Just some words on a line.' }])
  })

  it('parses a realistic changelog entry', () => {
    const md = `## [0.9.6] — 2026-04-13

### Fixed
- iOS PWA safe-area padding bug

### Added
- New thing one
- New thing two

---

## [0.9.5] — 2026-04-13

First tracked release.
`
    const blocks = parseChangelog(md)
    expect(blocks).toEqual([
      { type: 'h2', text: '[0.9.6] — 2026-04-13' },
      { type: 'h3', text: 'Fixed' },
      { type: 'ul', items: ['iOS PWA safe-area padding bug'] },
      { type: 'h3', text: 'Added' },
      { type: 'ul', items: ['New thing one', 'New thing two'] },
      { type: 'hr' },
      { type: 'h2', text: '[0.9.5] — 2026-04-13' },
      { type: 'p', text: 'First tracked release.' },
    ])
  })

  it('ignores blank lines between blocks', () => {
    const blocks = parseChangelog('## one\n\n\n## two')
    expect(blocks).toEqual([
      { type: 'h2', text: 'one' },
      { type: 'h2', text: 'two' },
    ])
  })
})
