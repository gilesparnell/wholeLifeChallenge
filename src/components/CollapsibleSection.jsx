import { useState } from 'react'
import { colors, fonts } from '../styles/theme'

export const lsKey = (id) => `wlc-progress-open-${id}`

export const readSectionOpen = (id, defaultOpen) => {
  try {
    const val = localStorage.getItem(lsKey(id))
    if (val === '1') return true
    if (val === '0') return false
    return defaultOpen
  } catch {
    return defaultOpen
  }
}

export const writeSectionOpen = (id, isOpen) => {
  try {
    localStorage.setItem(lsKey(id), isOpen ? '1' : '0')
  } catch {
    // ignore
  }
}

/**
 * Minimal section-level accordion. Adds a labelled toggle header above
 * any group of existing cards — does NOT add its own card wrapper so the
 * children keep their own background/border/padding unchanged.
 */
export default function CollapsibleSection({ id, title, defaultOpen = true, children }) {
  const [isOpen, setIsOpen] = useState(() => readSectionOpen(id, defaultOpen))

  const toggle = () => {
    const next = !isOpen
    writeSectionOpen(id, next)
    setIsOpen(next)
  }

  return (
    <div style={{ marginBottom: isOpen ? 0 : 16 }}>
      <button
        onClick={toggle}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 2px',
          background: 'transparent', border: 'none',
          borderBottom: `1px solid ${colors.border}`,
          marginBottom: isOpen ? 14 : 0,
          cursor: 'pointer',
          fontFamily: fonts.body,
        }}
      >
        <span style={{
          fontSize: 11, fontWeight: 700, color: colors.textMuted,
          textTransform: 'uppercase', letterSpacing: 1.5,
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 13, color: colors.textMuted,
          transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.2s ease',
          display: 'inline-block',
          lineHeight: 1,
        }}>
          ▾
        </span>
      </button>

      {isOpen && children}
    </div>
  )
}
