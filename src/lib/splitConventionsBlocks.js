// Splits the parsed changelog block array into three slices so the
// /changelog page can hide the dense "Conventions" preface behind a
// link + modal instead of inlining it.
//
//   { before, conventions, after }
//
// `conventions` starts at the `## Conventions` h2 (case-insensitive)
// and ends at — but does NOT include — the next `hr` or `h2` block.
// That trailing separator stays at the head of `after` so the visual
// divider between the link and the first version entry is preserved.
//
// If no Conventions section is found, `conventions` is empty and the
// original blocks pass through `after` unchanged so the caller can
// keep rendering the same way it always did.

const isConventionsHeading = (block) =>
  block && block.type === 'h2' && /^conventions$/i.test((block.text || '').trim())

export function splitConventionsBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return { before: [], conventions: [], after: [] }
  }

  const startIndex = blocks.findIndex(isConventionsHeading)
  if (startIndex === -1) {
    return { before: [], conventions: [], after: blocks.slice() }
  }

  // Walk forward from the heading until we hit the boundary block.
  let endIndex = blocks.length
  for (let i = startIndex + 1; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.type === 'hr' || b.type === 'h2') {
      endIndex = i
      break
    }
  }

  return {
    before: blocks.slice(0, startIndex),
    conventions: blocks.slice(startIndex, endIndex),
    after: blocks.slice(endIndex),
  }
}
