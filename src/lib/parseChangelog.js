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
      blocks.push({ type: 'h1', text: line.slice(2).trim() })
    } else if (line.startsWith('## ')) {
      closeList()
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
    } else if (line.startsWith('### ')) {
      closeList()
      blocks.push({ type: 'h3', text: line.slice(4).trim() })
    } else if (line.trim() === '---') {
      closeList()
      blocks.push({ type: 'hr' })
    } else if (line.startsWith('- ')) {
      const item = line.slice(2).trim()
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
      blocks.push({ type: 'p', text: line.trim() })
    }
  }

  return blocks
}
