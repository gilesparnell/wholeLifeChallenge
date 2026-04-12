import { useState } from 'react'
import { colors, fonts } from '../../styles/theme'

export default function SleepCard({ habit, value, canEdit, onChange }) {
  const [showInput, setShowInput] = useState(false)
  const completed = value?.completed || false
  const hours = value?.hours

  const handleClear = () => {
    onChange({ completed: false, hours: null })
    setShowInput(false)
  }

  return (
    <div className="habit-card" style={{
      background: colors.surface, borderRadius: 14, padding: '14px 16px', marginBottom: 8,
      border: `1px solid ${completed ? habit.color + '33' : colors.border}`,
      opacity: canEdit ? 1 : 0.5,
    }}>
      <div
        onClick={() => canEdit && setShowInput(!showInput)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: canEdit ? 'pointer' : 'default' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{habit.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: completed ? habit.color : colors.textDim }}>{habit.label}</div>
            <div style={{ fontSize: 12, color: colors.textFaint }}>
              {completed && hours != null ? `${hours} hours` : habit.desc}
            </div>
          </div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: completed ? habit.color : colors.surfaceHover,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: completed ? 16 : 12, transition: 'all 0.2s ease',
          color: completed ? '#fff' : colors.textFaint,
        }}>
          {completed ? '\u2713' : 'hrs'}
        </div>
      </div>

      {showInput && canEdit && (
        <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((h) => (
              <button
                key={h}
                onClick={() => onChange({ completed: true, hours: h })}
                data-testid={`sleep-${h}`}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontFamily: fonts.body, fontWeight: 600,
                  background: hours === h ? habit.color : colors.surfaceHover,
                  color: hours === h ? '#fff' : colors.textMuted,
                }}
              >
                {h}
              </button>
            ))}
          </div>
          {completed && (
            <button onClick={handleClear} style={{
              padding: '6px 8px', borderRadius: 8, border: `1px solid ${colors.borderSubtle}`,
              background: 'transparent', color: colors.textGhost, fontSize: 12, cursor: 'pointer',
              fontFamily: fonts.body,
            }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
