import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CHANGELOG_TEXT } from '../lib/changelogContent'
import { parseChangelog } from '../lib/parseChangelog'
import { annotateChangelogBlocks } from '../lib/annotateChangelogBlocks'
import { splitConventionsBlocks } from '../lib/splitConventionsBlocks'
import { extractVersionSlug } from '../lib/changelogVersionSlug'
import InlineMarkdown from '../components/InlineMarkdown'
import { colors, fonts } from '../styles/theme'

export default function Changelog() {
  const navigate = useNavigate()
  const location = useLocation()
  const allBlocks = annotateChangelogBlocks(parseChangelog(CHANGELOG_TEXT))
  const { before, conventions, after } = splitConventionsBlocks(allBlocks)
  const [conventionsOpen, setConventionsOpen] = useState(false)

  // Honour the URL hash (e.g. /changelog#0.16.0) on mount and on hash change.
  // Browsers don't auto-scroll for SPA route loads with a fragment.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = location.hash?.replace(/^#/, '')
    if (!hash) return
    // Defer to next paint so the headings have mounted with their ids.
    const id = window.requestAnimationFrame(() => {
      const el = document.getElementById(hash)
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
    return () => window.cancelAnimationFrame(id)
  }, [location.hash])

  const handleClose = () => {
    // If the user landed here via a direct deep link (e.g. shared URL
    // pointing at /changelog#0.16.0), there's nothing to go back to.
    // Fall back to home so Close is never a no-op.
    if (typeof window !== 'undefined' && window.history.length <= 1) {
      navigate('/')
      return
    }
    navigate(-1)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        fontFamily: fonts.body,
      }}
    >
      {/* Match the same column width + safe-area padding the
          authenticated Layout uses, so the public /changelog renders
          with identical page chrome (font, dark background, max-width
          container). Uses the same classname as Layout so the
          responsive breakpoints apply. */}
      <style>{`
        .wlc-public-page {
          max-width: 480px;
          margin: 0 auto;
          padding-top: calc(20px + env(safe-area-inset-top));
          padding-right: calc(16px + env(safe-area-inset-right));
          padding-bottom: calc(40px + env(safe-area-inset-bottom));
          padding-left: calc(16px + env(safe-area-inset-left));
        }
        @media (min-width: 768px) {
          .wlc-public-page {
            max-width: 720px;
            padding-top: calc(32px + env(safe-area-inset-top));
            padding-right: calc(24px + env(safe-area-inset-right));
            padding-bottom: calc(48px + env(safe-area-inset-bottom));
            padding-left: calc(24px + env(safe-area-inset-left));
          }
        }
        @media (min-width: 1024px) {
          .wlc-public-page { max-width: 960px; }
        }
      `}</style>
    <div
      className="wlc-public-page"
      style={{
        position: 'relative',
        paddingBottom: 24,
      }}
    >
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close changelog"
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 12px)',
          right: 'calc(env(safe-area-inset-right) + 12px)',
          background: colors.surface,
          border: `1px solid ${colors.borderSubtle}`,
          color: colors.text,
          fontSize: 13,
          lineHeight: 1,
          cursor: 'pointer',
          padding: '8px 14px',
          borderRadius: 999,
          fontFamily: fonts.body,
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
          zIndex: 2000,
          minHeight: 36,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>×</span>
        <span>Close</span>
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
        <InlineMarkdown text={block.text} />
      </h1>
    )
  }

  if (block.type === 'h2') {
    const slug = extractVersionSlug(block.text)
    const handleCopyLink = async () => {
      if (!slug) return
      const url = `${window.location.origin}/changelog#${slug}`
      try {
        await navigator.clipboard?.writeText(url)
      } catch {
        // Best-effort — older browsers may reject silently. Falling back
        // to a prompt() would be more annoying than a no-op.
      }
    }
    return (
      <h2
        id={slug || undefined}
        style={{
          fontFamily: fonts.display,
          fontSize: 18,
          fontWeight: 600,
          margin: '28px 0 8px 0',
          color: colors.accent,
          letterSpacing: 0.2,
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span><InlineMarkdown text={block.text} /></span>
        {slug && (
          <button
            type="button"
            onClick={handleCopyLink}
            data-testid={`copy-link-${slug}`}
            aria-label={`Copy link to v${slug}`}
            title={`Copy link to v${slug}`}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textFaint,
              fontSize: 12,
              fontFamily: fonts.body,
              cursor: 'pointer',
              padding: '2px 6px',
              borderRadius: 6,
              fontWeight: 500,
              letterSpacing: 0,
            }}
          >
            🔗 link
          </button>
        )}
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
        <InlineMarkdown text={block.text} />
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
          <li key={i} style={{ marginBottom: 4 }}>
            <InlineMarkdown text={item} />
          </li>
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
        <InlineMarkdown text={block.text} />
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
