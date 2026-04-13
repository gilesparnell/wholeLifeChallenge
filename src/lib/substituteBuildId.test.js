import { describe, it, expect } from 'vitest'
import { substituteBuildId, BUILD_ID_PLACEHOLDER } from './substituteBuildId'

describe('substituteBuildId', () => {
  it('replaces a single placeholder with the given id', () => {
    const template = `const CACHE_NAME = 'wlc-cache-${BUILD_ID_PLACEHOLDER}'`
    const result = substituteBuildId(template, 'abc123')
    expect(result).toBe(`const CACHE_NAME = 'wlc-cache-abc123'`)
  })

  it('replaces all occurrences when the placeholder appears multiple times', () => {
    const template = `// version: ${BUILD_ID_PLACEHOLDER}\nconst CACHE = '${BUILD_ID_PLACEHOLDER}'`
    const result = substituteBuildId(template, 'xyz789')
    expect(result).toBe(`// version: xyz789\nconst CACHE = 'xyz789'`)
  })

  it('returns the template unchanged when the placeholder is absent', () => {
    const template = `const foo = 'bar'`
    expect(substituteBuildId(template, 'abc')).toBe(template)
  })

  it('uses "dev" when no build id is given', () => {
    const template = `const CACHE = '${BUILD_ID_PLACEHOLDER}'`
    expect(substituteBuildId(template)).toBe(`const CACHE = 'dev'`)
  })

  it('uses "dev" when an empty string is given', () => {
    const template = `const CACHE = '${BUILD_ID_PLACEHOLDER}'`
    expect(substituteBuildId(template, '')).toBe(`const CACHE = 'dev'`)
  })

  it('handles null template safely', () => {
    expect(substituteBuildId(null, 'abc')).toBe('')
  })

  it('handles undefined template safely', () => {
    expect(substituteBuildId(undefined, 'abc')).toBe('')
  })

  it('exposes BUILD_ID_PLACEHOLDER as a distinctive token unlikely to collide with real code', () => {
    // The placeholder should not appear in any realistic JS code by accident
    expect(BUILD_ID_PLACEHOLDER).toContain('__')
    expect(BUILD_ID_PLACEHOLDER.length).toBeGreaterThan(6)
  })
})
