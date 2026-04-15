import { colors, fonts } from '../../styles/theme'

const HABITS_IN_ORDER = [
  { key: 'nutrition', label: 'Nutrition', icon: '\u{1F957}' },
  { key: 'exercise', label: 'Exercise', icon: '\u{1F4AA}' },
  { key: 'mobilize', label: 'Mobilise', icon: '\u{1F9D8}' },
  { key: 'sleep', label: 'Sleep', icon: '\u{1F319}' },
  { key: 'hydrate', label: 'Hydrate', icon: '\u{1F4A7}' },
  { key: 'wellbeing', label: 'Wellbeing', icon: '\u{1F33F}' },
  { key: 'reflect', label: 'Reflect', icon: '\u{270D}\uFE0F' },
]

export default function StreaksStrip({ streaks }) {
  if (!streaks) return null
  const total = HABITS_IN_ORDER.reduce((s, h) => s + (streaks[h.key] || 0), 0)
  if (total === 0) return null

  return (
    <div
      aria-label="Current streaks"
      style={{
        background: colors.surface,
        borderRadius: 14,
        border: `1px solid ${colors.border}`,
        padding: '14px 8px',
        marginBottom: 20,
        display: 'flex',
        gap: 6,
        overflowX: 'auto',
      }}
    >
      {HABITS_IN_ORDER.map(({ key, label, icon }) => {
        const days = streaks[key] || 0
        const isHot = days >= 3
        return (
          <div
            key={key}
            style={{
              flex: '0 0 auto',
              minWidth: 68,
              textAlign: 'center',
              padding: '6px 8px',
              opacity: days > 0 ? 1 : 0.4,
            }}
          >
            <div style={{ fontSize: 18, lineHeight: 1, marginBottom: 4 }}>
              {isHot ? '\u{1F525}' : icon}
            </div>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 18,
                fontWeight: 400,
                color: isHot ? colors.orange : colors.text,
                lineHeight: 1,
              }}
            >
              {days}
            </div>
            <div
              style={{
                fontSize: 9,
                color: colors.textFaint,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginTop: 4,
              }}
            >
              {label}
            </div>
          </div>
        )
      })}
    </div>
  )
}
