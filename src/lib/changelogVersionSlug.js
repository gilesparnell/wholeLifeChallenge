// Pull version info out of an h2 changelog heading.
//
// Expected formats (both produced by CHANGELOG.md):
//   [0.16.0] — 21 Apr 2026 — Title
//   [0.15.0 → 0.15.1] — 19 Apr 2026 — Title    (range = "multi-stage release")
//
// For the slug we always return the LAST version in the range — that's the
// version actually shipped, and it's what /changelog#0.15.1 should anchor to.

const BRACKET_RE = /\[([^\]]+)\]/
const VERSION_RE = /\d+\.\d+\.\d+/g

export function extractVersionSlug(heading) {
  if (!heading || typeof heading !== 'string') return null
  const bracketMatch = BRACKET_RE.exec(heading)
  if (!bracketMatch) return null
  const versions = bracketMatch[1].match(VERSION_RE)
  if (!versions || versions.length === 0) return null
  return versions[versions.length - 1]
}

export function extractVersionHeadingParts(heading) {
  if (!heading || typeof heading !== 'string') return null
  const version = extractVersionSlug(heading)
  if (!version) return null
  const bracketMatch = BRACKET_RE.exec(heading)
  const range = bracketMatch ? bracketMatch[0] : `[${version}]`
  // Split the rest by the em-dash separator used throughout the changelog.
  // Tolerate both "—" and "-" just in case.
  const rest = heading
    .slice(bracketMatch.index + range.length)
    .replace(/^\s*[—-]\s*/, '')
    .trim()
  const parts = rest.split(/\s+[—-]\s+/).map((p) => p.trim()).filter(Boolean)
  const date = parts[0] || ''
  const title = parts.slice(1).join(' — ')
  return { version, range, date, title }
}
