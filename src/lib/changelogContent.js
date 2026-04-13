// Import the project's CHANGELOG.md as a raw string via Vite's ?raw loader.
// Exposed as a named export so tests can mock this module without trying
// to mock a query-string import directly.
//
// Bumping CHANGELOG.md at repo root automatically flows through to the
// /changelog page — no manual sync required.

import raw from '../../CHANGELOG.md?raw'

export const CHANGELOG_TEXT = raw
