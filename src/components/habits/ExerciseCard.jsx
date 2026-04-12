import { useState } from 'react'
import { colors, fonts } from '../../styles/theme'

const DURATION_OPTIONS = [15, 30, 45, 60, 90]

export default function ExerciseCard({ habit, value, canEdit, exerciseTypes, onChange }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const completed = value?.completed || false
  const selectedType = value?.type || ''
  const durationMinutes = value?.duration_minutes ?? null

  const handleSelect = (type) => {
    onChange({ completed: true, type, duration_minutes: durationMinutes })
    setShowDropdown(false)
  }

  const handleClear = () => {
    onChange({ completed: false, type: '', duration_minutes: null })
    setShowDropdown(false)
  }

  const handleDuration = (minutes) => {
    onChange({ completed: true, type: selectedType, duration_minutes: minutes })
  }

  const subtitle = completed
    ? `${selectedType}${durationMinutes ? ` \u00B7 ${durationMinutes} min` : ''}`
    : habit.desc

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
              {subtitle}
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
        <div style={{ marginTop: 10 }}>
          {/* Exercise type buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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

          {/* Duration buttons — shown only when a type is selected */}
          {completed && selectedType && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, color: colors.textFaint, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                Duration
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {DURATION_OPTIONS.map((min) => (
                  <button
                    key={min}
                    onClick={() => handleDuration(min)}
                    data-testid={`duration-${min}`}
                    style={{
                      padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 12, fontFamily: fonts.body, fontWeight: 600,
                      background: durationMinutes === min ? habit.color : colors.surfaceHover,
                      color: durationMinutes === min ? '#fff' : colors.textMuted,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {min}m
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="480"
                  placeholder="Custom"
                  data-testid="duration-custom"
                  value={durationMinutes && !DURATION_OPTIONS.includes(durationMinutes) ? durationMinutes : ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!isNaN(v) && v > 0) handleDuration(v)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: 70, padding: '5px 8px', borderRadius: 8, fontSize: 12,
                    fontFamily: fonts.body, fontWeight: 600, textAlign: 'center',
                    background: colors.surfaceHover, color: colors.text,
                    border: durationMinutes && !DURATION_OPTIONS.includes(durationMinutes)
                      ? `2px solid ${habit.color}` : `1px solid ${colors.borderSubtle}`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
