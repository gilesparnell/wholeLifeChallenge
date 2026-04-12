import { colors, fonts } from '../../styles/theme'

export default function HydrateCard({ habit, value, incrementMl = 250, canEdit, onChange }) {
  const currentMl = value?.current_ml || 0
  const targetMl = value?.target_ml || 2000
  const INCREMENT = incrementMl
  const completed = currentMl >= targetMl
  const pct = Math.min(100, Math.round((currentMl / targetMl) * 100))

  const addWater = () => {
    const newMl = currentMl + INCREMENT
    onChange({
      completed: newMl >= targetMl,
      current_ml: newMl,
      target_ml: targetMl,
    })
  }

  const removeWater = () => {
    const newMl = Math.max(0, currentMl - INCREMENT)
    onChange({
      completed: newMl >= targetMl,
      current_ml: newMl,
      target_ml: targetMl,
    })
  }

  return (
    <div className="habit-card" style={{
      background: colors.surface, borderRadius: 14, padding: '14px 16px', marginBottom: 8,
      border: `1px solid ${completed ? habit.color + '33' : colors.border}`,
      opacity: canEdit ? 1 : 0.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{habit.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: completed ? habit.color : colors.textDim }}>{habit.label}</div>
            <div style={{ fontSize: 12, color: colors.textFaint }}>
              {currentMl} / {targetMl} ml
            </div>
          </div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: completed ? habit.color : colors.surfaceHover,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, transition: 'all 0.2s ease',
        }}>
          {completed ? '\u2713' : `${pct}%`}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 6, background: colors.surfaceHover, borderRadius: 3, overflow: 'hidden',
        marginTop: 10,
      }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3, transition: 'width 0.3s ease',
          background: completed
            ? habit.color
            : `linear-gradient(90deg, ${habit.color}66, ${habit.color})`,
        }} />
      </div>

      {/* Buttons */}
      {canEdit && (
        <div style={{ marginTop: 10, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <button
            onClick={removeWater}
            disabled={currentMl === 0}
            data-testid="hydrate-minus"
            style={{
              width: 36, height: 36, borderRadius: 8, border: 'none', cursor: currentMl > 0 ? 'pointer' : 'default',
              background: colors.surfaceHover, color: currentMl > 0 ? colors.textMuted : colors.textGhost,
              fontSize: 18, fontFamily: fonts.body, fontWeight: 700,
            }}
          >
            -
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: habit.color, minWidth: 80, textAlign: 'center' }}>
            +{INCREMENT} ml
          </span>
          <button
            onClick={addWater}
            data-testid="hydrate-plus"
            style={{
              width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: habit.color, color: '#fff',
              fontSize: 18, fontFamily: fonts.body, fontWeight: 700,
            }}
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
