// Tiny inline-markdown tokenizer for the CHANGELOG.md subset we actually
// use: **bold** and `code` spans. Everything else is plain text.
//
// Returns an array of { type: 'text' | 'bold' | 'code', text: string }.
// Unclosed or empty delimiters are left as literal characters in a text
// token — that way malformed markdown fails soft (reader still sees the
// raw text, not a broken render).
//
// Code spans take priority over bold: inside a `...` backtick block,
// ** markers are NOT treated as formatting. That matches standard
// markdown semantics and, practically, means we can write things like
// `<strong>` or `**kwargs` inside backticks without them bolding.

const BOLD_DELIM = '**'
const CODE_DELIM = '`'

export function parseInlineMarkdown(input) {
  if (!input || typeof input !== 'string') return []

  const tokens = []
  let buffer = ''
  let i = 0

  const flushBuffer = () => {
    if (buffer.length > 0) {
      tokens.push({ type: 'text', text: buffer })
      buffer = ''
    }
  }

  while (i < input.length) {
    // Code span — highest priority, contents are not re-tokenised.
    if (input[i] === CODE_DELIM) {
      const closeIdx = input.indexOf(CODE_DELIM, i + 1)
      if (closeIdx !== -1 && closeIdx > i + 1) {
        flushBuffer()
        tokens.push({ type: 'code', text: input.slice(i + 1, closeIdx) })
        i = closeIdx + 1
        continue
      }
      // Unclosed or empty — leave the ` as plain text.
      buffer += input[i]
      i += 1
      continue
    }

    // Bold span — only when the pair `**` is found and properly closed.
    if (input.startsWith(BOLD_DELIM, i)) {
      const closeIdx = input.indexOf(BOLD_DELIM, i + BOLD_DELIM.length)
      if (closeIdx !== -1 && closeIdx > i + BOLD_DELIM.length) {
        flushBuffer()
        tokens.push({
          type: 'bold',
          text: input.slice(i + BOLD_DELIM.length, closeIdx),
        })
        i = closeIdx + BOLD_DELIM.length
        continue
      }
      // Unclosed or empty — treat the ** as literal text and advance
      // past both characters so we don't infinite-loop on the second `*`.
      buffer += BOLD_DELIM
      i += BOLD_DELIM.length
      continue
    }

    buffer += input[i]
    i += 1
  }

  flushBuffer()
  return tokens
}
