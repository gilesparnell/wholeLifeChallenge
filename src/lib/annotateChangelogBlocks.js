// Walks the flat block array emitted by parseChangelog and tags each
// block with a `dim` flag based on which subsection it lives inside.
// The /changelog page uses `dim` to render "Under the hood" (developer
// detail) content in a lower-contrast style so the "What's new"
// (customer-facing) bullets visually dominate.
//
// Rules:
//   - h2 (new version entry) → resets to dim=false
//   - hr (separator between entries) → resets to dim=false
//   - h3 whose text matches /under the hood|dev notes|technical/i → dim=true
//   - any other h3 → dim=false
//   - ul / p / h1 / anything else → inherits the current dim state
//
// `dim` is always a boolean; the caller can rely on it being defined.

const DIM_HEADINGS = /under\s*the\s*hood|dev\s*notes|technical/i

export function annotateChangelogBlocks(blocks) {
  if (!Array.isArray(blocks)) return []

  let dim = false
  return blocks.map((block) => {
    if (block.type === 'h2' || block.type === 'hr') {
      dim = false
    } else if (block.type === 'h3') {
      dim = DIM_HEADINGS.test(block.text || '')
    }
    return { ...block, dim }
  })
}
