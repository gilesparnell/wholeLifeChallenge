import { colors, fonts } from '../../styles/theme'
import { BONUS_INFO } from '../../lib/bonuses'

const COLOR_MAP = {
  green: '#2E9E5A',
  blue: '#2E8BC0',
  purple: '#6B5CE7',
  orange: '#C87F2A',
}

export default function BonusProgress({ bonuses }) {
  if (!bonuses) return null
  const entries = Object.entries(BONUS_INFO)

  return (
    <div
      aria-label="Bonus progress"
      style={{
        background: colors.surface,
        borderRadius: 14,
        border: `1px solid ${colors.border}`,
        padding: 16,
        marginBottom: 20,
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: colors.textDim,
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 14,
        }}
      >
        Bonus Progress
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {entries.map(([key, info]) => {
          const state = bonuses[key]
          if (!state) return null
          const pct = info.threshold > 0
            ? Math.min(100, Math.round((state.streak / info.threshold) * 100))
            : 0
          const barColor = COLOR_MAP[info.colorKey] || colors.accent
          return (
            <div key={key}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: colors.text, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span aria-hidden="true">{info.icon}</span>
                  {info.label}
                  {state.available > 0 && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 10,
                        fontWeight: 500,
                        color: barColor,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      {state.available} available
                    </span>
                  )}
                </span>
                <span style={{ color: colors.textFaint, fontFamily: fonts.body }}>
                  {state.streak}/{info.threshold}
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: colors.surfaceHover,
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: barColor,
                    borderRadius: 3,
                    transition: 'width 0.6s ease',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
