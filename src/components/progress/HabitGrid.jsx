import { useState, useMemo } from 'react'
import { scoreDay } from '../../lib/scoring'
import { colors, fonts } from '../../styles/theme'

const RANGE_OPTIONS = [
  { label: '1D', days: 1 },
  { label: '7D', days: 7 },
  { label: '14D', days: 14 },
  { label: 'All', days: null },
]

const isCompleted = (val) => {
  if (val === true) return true
  if (!val || typeof val !== 'object') return false
  return !!val.completed
}

const nutritionBg = (value) => {
  if (value == null || value < 0) return colors.surfaceHover
  // Interpolate between surfaceHover (0) and green (5)
  // Use opacity on green as a simple gradient proxy
  const pct = Math.min(1, value / 5)
  return `rgba(74, 232, 138, ${0.1 + pct * 0.8})`
}

const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })
}

export default function HabitGrid({ data, allDates, dayIndex, habits }) {
  const [range, setRange] = useState('7D')

  const visibleDates = useMemo(() => {
    const end = dayIndex + 1
    const opt = RANGE_OPTIONS.find((o) => o.label === range)
    const start = opt?.days == null ? 0 : Math.max(0, end - opt.days)
    return allDates.slice(start, end)
  }, [allDates, dayIndex, range])

  const cellStyle = {
    width: 26, minWidth: 26, height: 26,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 5, fontSize: 10, fontWeight: 600,
    fontFamily: fonts.body,
  }

  const thStyle = {
    fontSize: 14, color: colors.textDim, textAlign: 'center',
    padding: '4px 2px', fontWeight: 600,
    minWidth: 26,
  }

  return (
    <div>
      {/* Range filter pills */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setRange(opt.label)}
            style={{
              background: range === opt.label ? colors.accent : colors.surfaceHover,
              color: range === opt.label ? '#fff' : colors.textDim,
              border: 'none', borderRadius: 6, padding: '4px 10px',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: fonts.body,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grid table */}
      <div>
        <table style={{
          borderCollapse: 'collapse',
          fontSize: 12, width: '100%',
        }}>
          <thead>
            <tr>
              <th style={{
                ...thStyle, textAlign: 'left', minWidth: 52,
                position: 'sticky', left: 0, background: colors.surface,
                zIndex: 1, fontSize: 10, textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
              </th>
              <th style={thStyle} title="Nutrition">🥗</th>
              {habits.map((h) => (
                <th key={h.id} style={thStyle} title={h.label}>
                  {h.icon}
                </th>
              ))}
              <th style={{ ...thStyle, color: colors.accent }} title="Score">⭐</th>
            </tr>
          </thead>
          <tbody>
            {visibleDates.map((d) => {
              const day = data[d] || {}
              const score = scoreDay(day)
              return (
                <tr key={d}>
                  {/* Date cell — sticky */}
                  <td style={{
                    position: 'sticky', left: 0, background: colors.surface,
                    zIndex: 1, padding: '3px 4px 3px 0',
                    fontSize: 10, color: colors.textDim, whiteSpace: 'nowrap',
                  }}>
                    {formatDate(d)}
                  </td>

                  {/* Nutrition cell */}
                  <td style={{ padding: '3px 2px', textAlign: 'center' }}>
                    <div style={{
                      ...cellStyle,
                      background: nutritionBg(day.nutrition ?? -1),
                      color: colors.text,
                      margin: 'auto',
                    }}>
                      {day.nutrition != null ? day.nutrition : '–'}
                    </div>
                  </td>

                  {/* Habit cells */}
                  {habits.map((h) => {
                    const val = day[h.id]
                    const done = isCompleted(val)

                    // Hydrate partial
                    let bg = done ? h.color + 'cc' : colors.surfaceHover
                    let label = done ? '✓' : ''
                    let title = h.label

                    if (h.id === 'hydrate' && typeof val === 'object' && val) {
                      const ml = val.current_ml || 0
                      const target = val.target_ml || 2000
                      if (ml > 0 && ml < target) {
                        const pct = Math.round((ml / target) * 100)
                        bg = colors.orange + '99'
                        label = `${pct}%`
                        title = `${ml} ml / ${target} ml`
                      }
                    }

                    return (
                      <td key={h.id} style={{ padding: '3px 2px', textAlign: 'center' }}>
                        <div
                          title={title}
                          style={{ ...cellStyle, background: bg, color: done ? '#fff' : colors.textFaint, margin: 'auto' }}
                        >
                          {label}
                        </div>
                      </td>
                    )
                  })}

                  {/* Score cell */}
                  <td style={{ padding: '3px 2px', textAlign: 'center' }}>
                    <div style={{
                      ...cellStyle,
                      background: 'transparent',
                      color: colors.accent,
                      fontWeight: 700, margin: 'auto',
                    }}>
                      {score}
                    </div>
                  </td>
                </tr>
              )
            })}
            {visibleDates.length === 0 && (
              <tr>
                <td colSpan={habits.length + 3} style={{ color: colors.textDim, padding: 12, fontSize: 12 }}>
                  No data logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
