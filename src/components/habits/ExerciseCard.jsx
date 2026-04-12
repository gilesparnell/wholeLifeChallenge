import { useState } from 'react'
import { colors, fonts } from '../../styles/theme'

export default function ExerciseCard({ habit, value, canEdit, exerciseTypes, onChange }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const completed = value?.completed || false
  const selectedType = value?.type || ''

  const handleSelect = (type) => {
    onChange({ completed: true, type })
    setShowDropdown(false)
  }

  const handleClear = () => {
    onChange({ completed: false, type: '' })
    setShowDropdown(false)
  }

  return (
    <div className="habit-card" style={{
      background: colors.surface, borderRadius: 14, padding: '14px 16px', marginBottom: 8,
      border: `1px solid ${completed ? habit.color + '33' : colors.border}`,
      opacity: canEdit ? 1 : 0.5,
    }}>
      <div
        onClick={() => canEdit && setShowDropdown(!showDropdown)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: canEdit ? 'pointer' : 'default' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{habit.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: completed ? habit.color : colors.textDim }}>{habit.label}</div>
            <div style={{ fontSize: 12, color: colors.textFaint }}>
              {completed ? selectedType : habit.desc}
            </div>
          </div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: completed ? habit.color : colors.surfaceHover,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, transition: 'all 0.2s ease',
        }}>
          {completed ? '\u2713' : '\u25BE'}
        </div>
      </div>

      {showDropdown && canEdit && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {exerciseTypes.map((type) => (
            <button
              key={type}
              onClick={() => handleSelect(type)}
              data-testid={`exercise-option-${type}`}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontFamily: fonts.body, fontWeight: 600,
                background: selectedType === type ? habit.color : colors.surfaceHover,
                color: selectedType === type ? '#fff' : colors.textMuted,
                transition: 'all 0.15s ease',
              }}
            >
              {type}
            </button>
          ))}
          {completed && (
            <button
              onClick={handleClear}
              style={{
                padding: '6px 12px', borderRadius: 8, border: `1px solid ${colors.borderSubtle}`,
                cursor: 'pointer', fontSize: 12, fontFamily: fonts.body,
                background: 'transparent', color: colors.textGhost,
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}
