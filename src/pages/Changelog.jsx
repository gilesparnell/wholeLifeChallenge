import { useNavigate } from 'react-router-dom'
import { CHANGELOG_TEXT } from '../lib/changelogContent'
import { parseChangelog } from '../lib/parseChangelog'
import { colors, fonts } from '../styles/theme'

export default function Changelog() {
  const navigate = useNavigate()
  const blocks = parseChangelog(CHANGELOG_TEXT)

  const handleClose = () => navigate(-1)

  return (
    <div
      style={{
        position: 'relative',
        color: colors.text,
        fontFamily: fonts.body,
        paddingBottom: 24,
      }}
    >
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close changelog"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          background: 'transparent',
          border: 'none',
          color: colors.textDim,
          fontSize: 24,
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
          fontFamily: fonts.body,
        }}
      >
        ×
      </button>

      {blocks.map((block, i) => <Block key={i} block={block} />)}
    </div>
  )
}

function Block({ block }) {
  if (block.type === 'h1') {
    return (
      <h1
        style={{
          fontFamily: fonts.display,
          fontSize: 28,
          fontWeight: 300,
          margin: '0 0 12px 0',
          letterSpacing: -0.5,
        }}
      >
        {block.text}
      </h1>
    )
  }

  if (block.type === 'h2') {
    return (
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: 18,
          fontWeight: 600,
          margin: '28px 0 8px 0',
          color: colors.accent,
          letterSpacing: 0.2,
        }}
      >
        {block.text}
      </h2>
    )
  }

  if (block.type === 'h3') {
    return (
      <h3
        style={{
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          color: colors.textDim,
          margin: '16px 0 6px 0',
        }}
      >
        {block.text}
      </h3>
    )
  }

  if (block.type === 'ul') {
    return (
      <ul
        style={{
          margin: '0 0 8px 0',
          paddingLeft: 18,
          fontSize: 14,
          lineHeight: 1.5,
          color: colors.text,
        }}
      >
        {block.items.map((item, i) => (
          <li key={i} style={{ marginBottom: 4 }}>{item}</li>
        ))}
      </ul>
    )
  }

  if (block.type === 'p') {
    return (
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: colors.textDim,
          margin: '0 0 12px 0',
        }}
      >
        {block.text}
      </p>
    )
  }

  if (block.type === 'hr') {
    return (
      <hr
        style={{
          border: 'none',
          borderTop: `1px solid ${colors.borderSubtle}`,
          margin: '24px 0',
        }}
      />
    )
  }

  return null
}
