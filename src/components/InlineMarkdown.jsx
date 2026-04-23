import { parseInlineMarkdown } from '../lib/parseInlineMarkdown'
import { colors, fonts } from '../styles/theme'

export default function InlineMarkdown({ text }) {
  const tokens = parseInlineMarkdown(text)
  return (
    <>
      {tokens.map((tok, i) => {
        if (tok.type === 'bold') {
          return <strong key={i}>{tok.text}</strong>
        }
        if (tok.type === 'code') {
          return (
            <code
              key={i}
              style={{
                fontFamily: fonts.mono || 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: '0.92em',
                background: colors.surfaceHover,
                color: colors.text,
                padding: '1px 5px',
                borderRadius: 4,
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              {tok.text}
            </code>
          )
        }
        return <span key={i}>{tok.text}</span>
      })}
    </>
  )
}
