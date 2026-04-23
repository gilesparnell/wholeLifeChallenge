import { describe, it, expect } from 'vitest'
import { parseInlineMarkdown } from './parseInlineMarkdown'

describe('parseInlineMarkdown', () => {
  it('returns a single text token for plain text', () => {
    expect(parseInlineMarkdown('hello world')).toEqual([
      { type: 'text', text: 'hello world' },
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(parseInlineMarkdown('')).toEqual([])
  })

  it('returns an empty array for null / undefined', () => {
    expect(parseInlineMarkdown(null)).toEqual([])
    expect(parseInlineMarkdown(undefined)).toEqual([])
  })

  it('parses a bold span', () => {
    expect(parseInlineMarkdown('this is **bold** text')).toEqual([
      { type: 'text', text: 'this is ' },
      { type: 'bold', text: 'bold' },
      { type: 'text', text: ' text' },
    ])
  })

  it('parses bold at the start of the line', () => {
    expect(parseInlineMarkdown('**Know what changed.** Then continue.')).toEqual([
      { type: 'bold', text: 'Know what changed.' },
      { type: 'text', text: ' Then continue.' },
    ])
  })

  it('parses a code span', () => {
    expect(parseInlineMarkdown('edit `src/App.jsx` please')).toEqual([
      { type: 'text', text: 'edit ' },
      { type: 'code', text: 'src/App.jsx' },
      { type: 'text', text: ' please' },
    ])
  })

  it('handles multiple bold + code spans in the same string', () => {
    expect(parseInlineMarkdown('**A** then `b` and **C**')).toEqual([
      { type: 'bold', text: 'A' },
      { type: 'text', text: ' then ' },
      { type: 'code', text: 'b' },
      { type: 'text', text: ' and ' },
      { type: 'bold', text: 'C' },
    ])
  })

  it('treats an unclosed bold marker as plain text', () => {
    expect(parseInlineMarkdown('half **open never closes here')).toEqual([
      { type: 'text', text: 'half **open never closes here' },
    ])
  })

  it('treats an unclosed code marker as plain text', () => {
    expect(parseInlineMarkdown('unclosed `never ends here')).toEqual([
      { type: 'text', text: 'unclosed `never ends here' },
    ])
  })

  it('does not treat bold markers inside a code span as formatting', () => {
    expect(parseInlineMarkdown('`**not bold**` see')).toEqual([
      { type: 'code', text: '**not bold**' },
      { type: 'text', text: ' see' },
    ])
  })

  it('handles an empty bold span by leaving the delimiters alone', () => {
    expect(parseInlineMarkdown('empty ****here')).toEqual([
      { type: 'text', text: 'empty ****here' },
    ])
  })

  it('handles an empty code span by leaving the delimiters alone', () => {
    expect(parseInlineMarkdown('empty ``here')).toEqual([
      { type: 'text', text: 'empty ``here' },
    ])
  })

  it('handles consecutive bold spans separated by plain text', () => {
    expect(parseInlineMarkdown('**A** **B**')).toEqual([
      { type: 'bold', text: 'A' },
      { type: 'text', text: ' ' },
      { type: 'bold', text: 'B' },
    ])
  })

  it('preserves apostrophes and curly quotes inside bold spans', () => {
    expect(parseInlineMarkdown('**What’s new**')).toEqual([
      { type: 'bold', text: 'What’s new' },
    ])
  })

  it('preserves an em-dash between bold and text (the most common pattern in CHANGELOG)', () => {
    expect(parseInlineMarkdown('- **What’s new** — customer-facing outcomes')).toEqual([
      { type: 'text', text: '- ' },
      { type: 'bold', text: 'What’s new' },
      { type: 'text', text: ' — customer-facing outcomes' },
    ])
  })
})
