// Tiny markdown parser for the keep-a-changelog format used by CHANGELOG.md.
//
// Deliberately does NOT handle arbitrary markdown — just the subset that
// appears in our changelog: h1/h2/h3, bullet lists, horizontal rules, plain
// paragraphs. No inline formatting (bold/italic/links). If we ever need
// more, swap this for `marked` or similar, but for now hand-rolled keeps
// the no-new-deps rule intact.
//
// Returns an array of block objects:
//   { type: 'h1' | 'h2' | 'h3', text: string }
//   { type: 'ul', items: string[] }
//   { type: 'p', text: string }
//   { type: 'hr' }
//
// HTML entities (&rsquo; &ldquo; &rdquo; &rarr; etc.) are decoded so they
// render as their intended Unicode character instead of literal text.
// Unknown entities are left intact.

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
  rarr: '→',
  larr: '←',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  trade: '™',
  copy: '©',
  reg: '®',
  middot: '·',
  bull: '•',
  deg: '°',
  times: '×',
  check: '✓',
}

const ENTITY_RE = /&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]+);/g

function decodeEntities(text) {
  if (!text || text.indexOf('&') === -1) return text
  return text.replace(ENTITY_RE, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10)
      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code)
        } catch {
          return match
        }
      }
      return match
    }
    const replacement = NAMED_ENTITIES[body]
    return replacement !== undefined ? replacement : match
  })
}

export function parseChangelog(markdown) {
  if (!markdown || typeof markdown !== 'string') return []

  const blocks = []
  const lines = markdown.split('\n')
  let currentList = null

  const closeList = () => {
    currentList = null
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.startsWith('# ')) {
      closeList()
      blocks.push({ type: 'h1', text: decodeEntities(line.slice(2).trim()) })
    } else if (line.startsWith('## ')) {
      closeList()
      blocks.push({ type: 'h2', text: decodeEntities(line.slice(3).trim()) })
    } else if (line.startsWith('### ')) {
      closeList()
      blocks.push({ type: 'h3', text: decodeEntities(line.slice(4).trim()) })
    } else if (line.trim() === '---') {
      closeList()
      blocks.push({ type: 'hr' })
    } else if (line.startsWith('- ')) {
      const item = decodeEntities(line.slice(2).trim())
      if (!currentList) {
        currentList = { type: 'ul', items: [] }
        blocks.push(currentList)
      }
      currentList.items.push(item)
    } else if (line.trim() === '') {
      // Blank line — close any open list so a subsequent bullet starts a new one.
      closeList()
    } else {
      closeList()
      blocks.push({ type: 'p', text: decodeEntities(line.trim()) })
    }
  }

  return blocks
}
