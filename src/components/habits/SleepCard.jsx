import { useState } from 'react'
import { colors, fonts } from '../../styles/theme'

const MIN_HOURS = 0
const MAX_HOURS = 24
const STEP = 0.5
const PRESETS = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10]

const parseHours = (raw) => {
  if (raw == null || String(raw).trim() === '') return null
  const num = typeof raw === 'number' ? raw : parseFloat(raw)
  if (!Number.isFinite(num)) return null
  if (num < MIN_HOURS || num > MAX_HOURS) return null
  return num
}

export default function SleepCard({ habit, value, canEdit, onChange }) {
  const [showInput, setShowInput] = useState(false)
  const [customMode, setCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [customError, setCustomError] = useState(false)
  const completed = value?.completed || false
  const hours = value?.hours

  const handleClear = () => {
    onChange({ completed: false, hours: null })
    setShowInput(false)
    setCustomMode(false)
    setCustomValue('')
    setCustomError(false)
  }

  const handleCustomSave = () => {
    const parsed = parseHours(customValue)
    if (parsed === null) {
      setCustomError(true)
      return
    }
    onChange({ completed: true, hours: parsed })
    setCustomMode(false)
    setCustomValue('')
    setCustomError(false)
  }

  const handleCustomCancel = () => {
    setCustomMode(false)
    setCustomValue('')
    setCustomError(false)
  }

  const handleCustomKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCustomSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCustomCancel()
    }
  }

  const isCustomValue = completed && hours != null && !PRESETS.includes(hours)

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
          {completed ? '✓' : 'hrs'}
        </div>
      </div>

      {showInput && canEdit && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {PRESETS.map((h) => (
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
              <button
                onClick={() => { setCustomMode((m) => !m); setCustomError(false) }}
                data-testid="sleep-custom-toggle"
                aria-label="Custom sleep hours"
                aria-pressed={customMode}
                style={{
                  padding: '6px 10px', borderRadius: 8,
                  border: isCustomValue ? 'none' : `1px dashed ${colors.borderSubtle}`,
                  cursor: 'pointer',
                  fontSize: 12, fontFamily: fonts.body, fontWeight: 600,
                  background: isCustomValue ? habit.color : 'transparent',
                  color: isCustomValue ? '#fff' : colors.textMuted,
                }}
              >
                {isCustomValue ? `${hours} · custom` : 'Custom…'}
              </button>
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
          {customMode && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                min={MIN_HOURS}
                max={MAX_HOURS}
                step={STEP}
                value={customValue}
                onChange={(e) => { setCustomValue(e.target.value); if (customError) setCustomError(false) }}
                onKeyDown={handleCustomKeyDown}
                data-testid="sleep-custom-input"
                aria-label="Custom sleep hours input"
                placeholder="e.g. 3"
                autoFocus
                style={{
                  width: 80, padding: '6px 10px', borderRadius: 8,
                  border: `1px solid ${customError ? (colors.danger || '#dc2626') : colors.border}`,
                  background: colors.bg, color: colors.text, fontSize: 13, fontFamily: fonts.body,
                }}
              />
              <button
                onClick={handleCustomSave}
                data-testid="sleep-custom-save"
                style={{
                  padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontFamily: fonts.body, fontWeight: 600,
                  background: habit.color, color: '#fff',
                }}
              >
                Save
              </button>
              <button
                onClick={handleCustomCancel}
                data-testid="sleep-custom-cancel"
                style={{
                  padding: '6px 8px', borderRadius: 8, border: `1px solid ${colors.borderSubtle}`,
                  background: 'transparent', color: colors.textGhost, fontSize: 12, cursor: 'pointer',
                  fontFamily: fonts.body,
                }}
              >
                Cancel
              </button>
              {customError && (
                <span
                  data-testid="sleep-custom-error"
                  role="alert"
                  style={{ fontSize: 11, color: colors.danger || '#dc2626' }}
                >
                  Enter 0–24 hours.
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
