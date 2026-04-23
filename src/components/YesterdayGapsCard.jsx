import { useState, useEffect } from 'react'
import { HABITS } from '../lib/habits'
import { colors, fonts } from '../styles/theme'

const HABIT_META = Object.fromEntries(
  [...HABITS, { id: 'nutrition', label: 'Nutrition', icon: '\u{1F957}' }].map((h) => [
    h.id,
    { label: h.label, icon: h.icon },
  ])
)

const lsKey = (yesterday) => `wlc-gaps-dismissed-${yesterday}`

const readDismissed = (yesterday) => {
  try {
    const raw = localStorage.getItem(lsKey(yesterday))
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

const writeDismissed = (yesterday, set) => {
  try {
    localStorage.setItem(lsKey(yesterday), JSON.stringify([...set]))
  } catch {
    // ignore
  }
}

export default function YesterdayGapsCard({ yesterday, gaps, onNavigate, onAllDismissed }) {
  const [dismissed, setDismissed] = useState(() => readDismissed(yesterday))

  useEffect(() => {
    setDismissed(readDismissed(yesterday))
  }, [yesterday])

  const activeGaps = gaps.filter((id) => !dismissed.has(id))

  useEffect(() => {
    if (gaps.length > 0 && activeGaps.length === 0) onAllDismissed?.()
  }, [activeGaps.length, gaps.length, onAllDismissed])

  if (activeGaps.length === 0) return null

  const dismissOne = (id) => {
    const next = new Set(dismissed)
    next.add(id)
    writeDismissed(yesterday, next)
    setDismissed(next)
  }

  const dismissAll = () => {
    const next = new Set(gaps)
    writeDismissed(yesterday, next)
    setDismissed(next)
    onAllDismissed?.()
  }

  return (
    <div style={{
      background: colors.accent + '11',
      border: `1px solid ${colors.accent}33`,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 16,
      position: 'relative',
    }}>
      <button
        onClick={dismissAll}
        aria-label="Dismiss all"
        style={{
          position: 'absolute', top: 10, right: 10,
          background: 'transparent', border: 'none',
          color: colors.textMuted, cursor: 'pointer',
          fontSize: 16, lineHeight: 1, padding: 4,
        }}
      >
        ✕
      </button>

      <div style={{
        fontSize: 12, fontWeight: 600, color: colors.textDim,
        textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
      }}>
        Yesterday had some gaps — did you actually do these?
      </div>

      {activeGaps.map((id) => {
        const meta = HABIT_META[id] || { label: id, icon: '?' }
        return (
          <div key={id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 8, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 16 }}>{meta.icon}</span>
            <span style={{
              fontSize: 13, fontWeight: 600, color: colors.text,
              flex: 1, minWidth: 80,
            }}>
              {meta.label}
            </span>
            <button
              onClick={() => onNavigate?.(yesterday)}
              style={{
                background: colors.accent, color: '#fff',
                border: 'none', borderRadius: 8, padding: '5px 10px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: fonts.body,
              }}
            >
              Yes, log it
            </button>
            <button
              onClick={() => dismissOne(id)}
              style={{
                background: colors.surfaceHover, color: colors.textDim,
                border: `1px solid ${colors.border}`, borderRadius: 8,
                padding: '5px 10px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: fonts.body,
              }}
            >
              Nope
            </button>
          </div>
        )
      })}
    </div>
  )
}
