// Extract the latest shipped version's "What's new" bullets from CHANGELOG
// markdown. Used by the UpdateToast so users see a summary of what changed
// when the service worker picks up a new deploy.
//
// "Latest" = first h2 after the doc intro that has a version-like `[X.Y.Z]`
// bracket, i.e. skip the "## Conventions" header.

import { parseChangelog } from './parseChangelog'
import { extractVersionHeadingParts } from './changelogVersionSlug'

export function getLatestWhatsNew(markdown, { maxItems = 3 } = {}) {
  if (!markdown || typeof markdown !== 'string') return null

  const blocks = parseChangelog(markdown)
  if (blocks.length === 0) return null

  // Find the first h2 that has a version slug.
  const latestIdx = blocks.findIndex(
    (b) => b.type === 'h2' && extractVersionHeadingParts(b.text) != null,
  )
  if (latestIdx === -1) return null

  const headingParts = extractVersionHeadingParts(blocks[latestIdx].text)
  const { version, title } = headingParts

  // Walk forward from the version h2 until the next h2 or hr.
  let inWhatsNew = false
  const items = []
  for (let i = latestIdx + 1; i < blocks.length; i++) {
    const block = blocks[i]
    if (block.type === 'h2' || block.type === 'hr') break
    if (block.type === 'h3') {
      inWhatsNew = /what'?s new/i.test(block.text)
      continue
    }
    if (inWhatsNew && block.type === 'ul' && Array.isArray(block.items)) {
      items.push(...block.items)
    }
  }

  const hasMore = items.length > maxItems
  return {
    version,
    title,
    items: items.slice(0, maxItems),
    hasMore,
  }
}
