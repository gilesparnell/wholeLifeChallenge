// @vitest-environment node
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

  describe('HTML entity decoding', () => {
    it('decodes named entities in h2 text', () => {
      const [block] = parseChangelog('## Tap &ldquo;See what&rsquo;s new&rdquo;')
      expect(block.text).toBe('Tap “See what’s new”')
    })

    it('decodes named entities in h3 text', () => {
      const [block] = parseChangelog('### What&rsquo;s new')
      expect(block.text).toBe('What’s new')
    })

    it('decodes named entities in paragraph text', () => {
      const [block] = parseChangelog('An em-dash &mdash; and a right arrow &rarr;')
      expect(block.text).toBe('An em-dash — and a right arrow →')
    })

    it('decodes named entities in list items', () => {
      const [block] = parseChangelog('- Tap &ldquo;Save&rdquo; to keep it.')
      expect(block.items[0]).toBe('Tap “Save” to keep it.')
    })

    it('decodes a representative set of common named entities', () => {
      const md =
        '- amp &amp; | rsquo &rsquo; | lsquo &lsquo; | ldquo &ldquo; | rdquo &rdquo; | ' +
        'rarr &rarr; | mdash &mdash; | ndash &ndash; | hellip &hellip; | lt &lt; | gt &gt; | quot &quot;'
      const [block] = parseChangelog(md)
      const item = block.items[0]
      expect(item).toContain('amp &')
      expect(item).toContain('rsquo ’')
      expect(item).toContain('lsquo ‘')
      expect(item).toContain('ldquo “')
      expect(item).toContain('rdquo ”')
      expect(item).toContain('rarr →')
      expect(item).toContain('mdash —')
      expect(item).toContain('ndash –')
      expect(item).toContain('hellip …')
      expect(item).toContain('lt <')
      expect(item).toContain('gt >')
      expect(item).toContain('quot "')
    })

    it('decodes numeric entities (decimal and hex)', () => {
      const [block] = parseChangelog('- dec &#8217; and hex &#x2019;')
      expect(block.items[0]).toBe('dec ’ and hex ’')
    })

    it('leaves unknown entities untouched rather than silently dropping them', () => {
      const [block] = parseChangelog('- keep me &bogusentity; please')
      expect(block.items[0]).toBe('keep me &bogusentity; please')
    })

    it('leaves a bare ampersand (not an entity) alone', () => {
      const [block] = parseChangelog('- A & B are friends')
      expect(block.items[0]).toBe('A & B are friends')
    })

    it('handles entity at the start and end of a line', () => {
      const [block] = parseChangelog('## &ldquo;Hi&rdquo;')
      expect(block.text).toBe('“Hi”')
    })
  })
})
