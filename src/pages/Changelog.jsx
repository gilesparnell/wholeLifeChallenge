import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CHANGELOG_TEXT } from '../lib/changelogContent'
import { parseChangelog } from '../lib/parseChangelog'
import { annotateChangelogBlocks } from '../lib/annotateChangelogBlocks'
import { splitConventionsBlocks } from '../lib/splitConventionsBlocks'
import { colors, fonts } from '../styles/theme'

export default function Changelog() {
  const navigate = useNavigate()
  const allBlocks = annotateChangelogBlocks(parseChangelog(CHANGELOG_TEXT))
  const { before, conventions, after } = splitConventionsBlocks(allBlocks)
  const [conventionsOpen, setConventionsOpen] = useState(false)

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

      {before.map((block, i) => <Block key={`b${i}`} block={block} />)}

      {conventions.length > 0 && (
        <p style={{ fontSize: 13, color: colors.textDim, margin: '4px 0 8px 0' }}>
          <button
            type="button"
            onClick={() => setConventionsOpen(true)}
            data-testid="conventions-link"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: colors.accent,
              fontSize: 13,
              fontFamily: fonts.body,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 600,
            }}
          >
            Conventions
          </button>
          <span style={{ color: colors.textFaint }}> &mdash; how versions and entries are organised.</span>
        </p>
      )}

      {after.map((block, i) => <Block key={`a${i}`} block={block} />)}

      {conventionsOpen && (
        <ConventionsModal
          blocks={conventions}
          onClose={() => setConventionsOpen(false)}
        />
      )}
    </div>
  )
}

function ConventionsModal({ blocks, onClose }) {
  return (
    <div
      data-testid="conventions-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        data-testid="conventions-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.surface,
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 32px',
          width: '100%',
          maxWidth: 480,
          maxHeight: '80vh',
          overflowY: 'auto',
          animation: 'fadeUp 0.3s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              fontFamily: fonts.display,
              fontSize: 20,
              fontWeight: 400,
              color: colors.text,
              margin: 0,
            }}
          >
            Conventions
          </h3>
          <button
            type="button"
            onClick={onClose}
            data-testid="conventions-modal-close"
            aria-label="Close conventions"
            style={{
              background: 'none',
              border: 'none',
              color: colors.textGhost,
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            {'\u2715'}
          </button>
        </div>
        {/* Drop the conventions h2 itself — the modal already has a Conventions title */}
        {blocks
          .filter((b, i) => !(i === 0 && b.type === 'h2'))
          .map((block, i) => <Block key={`c${i}`} block={block} />)}
      </div>
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
          color: block.dim ? colors.textFaint : colors.textDim,
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
          color: block.dim ? colors.textDim : colors.text,
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
