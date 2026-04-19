// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { splitConventionsBlocks } from './splitConventionsBlocks'

const h1 = (text) => ({ type: 'h1', text })
const h2 = (text) => ({ type: 'h2', text })
const h3 = (text) => ({ type: 'h3', text })
const ul = (...items) => ({ type: 'ul', items })
const p = (text) => ({ type: 'p', text })
const hr = () => ({ type: 'hr' })

describe('splitConventionsBlocks', () => {
  it('isolates the Conventions h2 + its body up to the next hr', () => {
    const blocks = [
      h1('Changelog'),
      p('All notable changes.'),
      h2('Conventions'),
      h3('Versioning'),
      ul('patch', 'minor', 'major'),
      h3('Entry format'),
      p('Each entry is split into:'),
      ul("What's new", 'Under the hood'),
      hr(),
      h2('[0.14.0] — 19 Apr 2026'),
      h3("What's new"),
      ul('a thing'),
    ]
    const { before, conventions, after } = splitConventionsBlocks(blocks)
    expect(before).toEqual([h1('Changelog'), p('All notable changes.')])
    expect(conventions).toEqual([
      h2('Conventions'),
      h3('Versioning'),
      ul('patch', 'minor', 'major'),
      h3('Entry format'),
      p('Each entry is split into:'),
      ul("What's new", 'Under the hood'),
    ])
    // The hr that separated Conventions from the next entry is the first
    // block of `after` so the visual divider between the link and the
    // first entry is preserved.
    expect(after[0]).toEqual(hr())
    expect(after.find((b) => b.type === 'h2')).toEqual(h2('[0.14.0] — 19 Apr 2026'))
  })

  it('also stops at the next h2 when no hr is present between sections', () => {
    const blocks = [
      h1('Changelog'),
      h2('Conventions'),
      h3('Versioning'),
      ul('patch'),
      h2('[0.14.0]'),
      ul('thing'),
    ]
    const { conventions, after } = splitConventionsBlocks(blocks)
    expect(conventions).toEqual([h2('Conventions'), h3('Versioning'), ul('patch')])
    expect(after[0]).toEqual(h2('[0.14.0]'))
  })

  it('matches the Conventions heading case-insensitively', () => {
    const blocks = [h1('CL'), h2('CONVENTIONS'), p('blah'), hr(), h2('[1.0.0]')]
    const { conventions } = splitConventionsBlocks(blocks)
    expect(conventions[0]).toEqual(h2('CONVENTIONS'))
    expect(conventions).toContainEqual(p('blah'))
  })

  it('returns empty conventions and original blocks in `before` when no Conventions section exists', () => {
    const blocks = [h1('Changelog'), p('hi'), hr(), h2('[1.0.0]'), ul('thing')]
    const { before, conventions, after } = splitConventionsBlocks(blocks)
    expect(conventions).toEqual([])
    // Caller should still render everything; we put it all into `after`
    // so the rest of the page composes the same way as before the split
    // existed.
    expect(before).toEqual([])
    expect(after).toEqual(blocks)
  })

  it('returns empty arrays for null/undefined/non-array input', () => {
    expect(splitConventionsBlocks(null)).toEqual({ before: [], conventions: [], after: [] })
    expect(splitConventionsBlocks(undefined)).toEqual({ before: [], conventions: [], after: [] })
    expect(splitConventionsBlocks('oops')).toEqual({ before: [], conventions: [], after: [] })
  })

  it('does not include the closing hr in conventions', () => {
    const blocks = [h2('Conventions'), p('x'), hr(), h2('[1.0.0]')]
    const { conventions, after } = splitConventionsBlocks(blocks)
    expect(conventions).not.toContainEqual(hr())
    expect(after[0]).toEqual(hr())
  })
})
