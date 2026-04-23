import { colors, fonts } from '../../styles/theme'
import { HABITS } from '../../lib/habits'

const HABIT_META = Object.fromEntries(
  [...HABITS, { id: 'nutrition', label: 'Nutrition', icon: '\u{1F957}', color: colors.accent }].map(
    (h) => [h.id, { label: h.label, icon: h.icon, color: h.color }]
  )
)

const LOW_THRESHOLD = 60

export default function HabitConsistencyPanel({ consistency }) {
  if (!consistency || consistency.length === 0) return null

  const callouts = []

  consistency.forEach((entry) => {
    if (entry.id === 'nutrition') {
      if (entry.avgScore != null && entry.avgScore < 3.5) {
        callouts.push(
          `Nutrition is averaging ${entry.avgScore}/5 — that's ${entry.pointsLost} pts lost.`
        )
      }
      return
    }
    if (entry.id === 'hydrate') {
      if (entry.completionRate < LOW_THRESHOLD) {
        callouts.push(
          `Hydrate: only ${entry.completed} of ${entry.elapsed} days fully hit — ${entry.pointsLost} pts lost.`
        )
      }
      if (entry.avgMl != null && entry.avgTarget && entry.avgFillRate < LOW_THRESHOLD) {
        callouts.push(
          `Hydrate: averaging ${entry.avgMl.toLocaleString()} ml vs ${entry.avgTarget.toLocaleString()} ml target (${entry.avgFillRate}%). Consider lowering your daily target in preferences, or logging more water.`
        )
      }
      return
    }
    if (entry.completionRate < LOW_THRESHOLD) {
      const meta = HABIT_META[entry.id]
      callouts.push(
        `${meta?.label ?? entry.id}: only ${entry.completed} of ${entry.elapsed} days — ${entry.pointsLost} pts lost.`
      )
    }
  })

  return (
    <div>
      {consistency.map((entry) => {
        const meta = HABIT_META[entry.id]
        const isNutrition = entry.id === 'nutrition'
        const rate = isNutrition
          ? Math.round(((entry.avgScore ?? 0) / 5) * 100)
          : (entry.completionRate ?? 0)
        const isLow = rate < LOW_THRESHOLD
        const barColor = isLow ? colors.orange : (meta?.color ?? colors.accent)

        return (
          <div key={entry.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 0',
            borderBottom: `1px solid ${colors.border}`,
          }}>
            <span style={{ fontSize: 16, width: 22, textAlign: 'center', flexShrink: 0 }}>
              {meta?.icon ?? '?'}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 600, color: colors.text,
              width: 72, flexShrink: 0,
            }}>
              {meta?.label ?? entry.id}
            </span>

            {/* Completion bar */}
            <div style={{
              width: 100, height: 8, borderRadius: 4,
              background: colors.surfaceHover, flexShrink: 0, overflow: 'hidden',
            }}>
              <div style={{
                width: `${rate}%`, height: '100%',
                background: barColor, borderRadius: 4,
                transition: 'width 0.3s ease',
              }} />
            </div>

            <span style={{ fontSize: 11, color: isLow ? colors.orange : colors.textDim, width: 32 }}>
              {rate}%
            </span>

            {isNutrition ? (
              <span style={{ fontSize: 11, color: colors.textDim }}>
                avg {entry.avgScore}/5
              </span>
            ) : (
              <span style={{ fontSize: 11, color: colors.textDim }}>
                {entry.completed}/{entry.elapsed} days
              </span>
            )}

            <span style={{
              fontSize: 11, color: isLow ? colors.orange : colors.textFaint,
              marginLeft: 'auto', fontWeight: isLow ? 700 : 400,
              fontFamily: fonts.body,
            }}>
              {entry.pointsLost > 0 ? `-${entry.pointsLost} pts` : ''}
            </span>
          </div>
        )
      })}

      {callouts.length > 0 && (
        <div style={{
          marginTop: 14,
          background: colors.orange + '18',
          borderLeft: `3px solid ${colors.orange}`,
          borderRadius: 8, padding: '10px 14px',
        }}>
          <div style={{
            fontSize: 12, fontWeight: 700, color: colors.orange, marginBottom: 6,
          }}>
            ⚠️ Your weakest habits this challenge
          </div>
          {callouts.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: colors.text, marginBottom: 4 }}>
              • {c}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
