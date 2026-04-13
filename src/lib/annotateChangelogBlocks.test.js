import { describe, it, expect } from 'vitest'
import { annotateChangelogBlocks } from './annotateChangelogBlocks'

describe('annotateChangelogBlocks', () => {
  it('returns an empty array for empty input', () => {
    expect(annotateChangelogBlocks([])).toEqual([])
  })

  it('returns an empty array for non-array input', () => {
    expect(annotateChangelogBlocks(null)).toEqual([])
    expect(annotateChangelogBlocks(undefined)).toEqual([])
    expect(annotateChangelogBlocks('not an array')).toEqual([])
  })

  it('tags an h2 with dim=false', () => {
    const result = annotateChangelogBlocks([{ type: 'h2', text: '[0.10.2] — 2026-04-13' }])
    expect(result).toEqual([{ type: 'h2', text: '[0.10.2] — 2026-04-13', dim: false }])
  })

  it('tags an h3 "What\'s new" with dim=false', () => {
    const result = annotateChangelogBlocks([{ type: 'h3', text: "What's new" }])
    expect(result[0].dim).toBe(false)
  })

  it('tags an h3 "Under the hood" with dim=true', () => {
    const result = annotateChangelogBlocks([{ type: 'h3', text: 'Under the hood' }])
    expect(result[0].dim).toBe(true)
  })

  it('is case-insensitive for "Under the hood"', () => {
    const lowerCase = annotateChangelogBlocks([{ type: 'h3', text: 'under the hood' }])
    const upperCase = annotateChangelogBlocks([{ type: 'h3', text: 'UNDER THE HOOD' }])
    const mixed = annotateChangelogBlocks([{ type: 'h3', text: 'Under The Hood' }])
    expect(lowerCase[0].dim).toBe(true)
    expect(upperCase[0].dim).toBe(true)
    expect(mixed[0].dim).toBe(true)
  })

  it('also treats "Dev notes" and "Technical" as dim', () => {
    const devNotes = annotateChangelogBlocks([{ type: 'h3', text: 'Dev notes' }])
    const technical = annotateChangelogBlocks([{ type: 'h3', text: 'Technical' }])
    expect(devNotes[0].dim).toBe(true)
    expect(technical[0].dim).toBe(true)
  })

  it('bullets inside the "Under the hood" section inherit dim=true', () => {
    const blocks = [
      { type: 'h3', text: 'Under the hood' },
      { type: 'ul', items: ['detail 1', 'detail 2'] },
    ]
    const result = annotateChangelogBlocks(blocks)
    expect(result[0].dim).toBe(true)
    expect(result[1].dim).toBe(true)
  })

  it('bullets inside the "What\'s new" section have dim=false', () => {
    const blocks = [
      { type: 'h3', text: "What's new" },
      { type: 'ul', items: ['a shiny thing'] },
    ]
    const result = annotateChangelogBlocks(blocks)
    expect(result[0].dim).toBe(false)
    expect(result[1].dim).toBe(false)
  })

  it('resets to dim=false when a new h3 (non-dim) follows a dim section', () => {
    const blocks = [
      { type: 'h3', text: 'Under the hood' },
      { type: 'ul', items: ['tech'] },
      { type: 'h3', text: "What's new" },
      { type: 'ul', items: ['user'] },
    ]
    const result = annotateChangelogBlocks(blocks)
    expect(result[0].dim).toBe(true)
    expect(result[1].dim).toBe(true)
    expect(result[2].dim).toBe(false)
    expect(result[3].dim).toBe(false)
  })

  it('resets to dim=false when an h2 starts a new version entry', () => {
    const blocks = [
      { type: 'h3', text: 'Under the hood' },
      { type: 'ul', items: ['tech'] },
      { type: 'h2', text: '[0.9.0] — 2026-04-01' },
    ]
    const result = annotateChangelogBlocks(blocks)
    expect(result[2].dim).toBe(false)
  })

  it('resets to dim=false on an hr separator', () => {
    const blocks = [
      { type: 'h3', text: 'Under the hood' },
      { type: 'ul', items: ['tech'] },
      { type: 'hr' },
      { type: 'h2', text: '[0.9.0] — 2026-04-01' },
    ]
    const result = annotateChangelogBlocks(blocks)
    expect(result[2].dim).toBe(false)
    expect(result[3].dim).toBe(false)
  })

  it('leaves the h1 intro (not inside any version) with dim=false', () => {
    const blocks = [
      { type: 'h1', text: 'Changelog' },
      { type: 'p', text: 'Intro paragraph' },
    ]
    const result = annotateChangelogBlocks(blocks)
    expect(result[0].dim).toBe(false)
    expect(result[1].dim).toBe(false)
  })

  it('annotates a realistic two-entry fixture correctly', () => {
    const blocks = [
      { type: 'h1', text: 'Changelog' },
      { type: 'h2', text: '[0.10.2] — 2026-04-13' },
      { type: 'h3', text: "What's new" },
      { type: 'ul', items: ['user-facing thing'] },
      { type: 'h3', text: 'Under the hood' },
      { type: 'ul', items: ['technical thing'] },
      { type: 'hr' },
      { type: 'h2', text: '[0.10.1] — 2026-04-13' },
      { type: 'h3', text: "What's new" },
      { type: 'ul', items: ['another user thing'] },
    ]
    const result = annotateChangelogBlocks(blocks)
    const dims = result.map((b) => b.dim)
    // h1, h2, h3 new, ul new, h3 hood, ul hood, hr, h2, h3 new, ul new
    expect(dims).toEqual([false, false, false, false, true, true, false, false, false, false])
  })
})
