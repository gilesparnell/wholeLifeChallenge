import { useState } from 'react'
import { colors, fonts } from '../../styles/theme'
import { getExerciseEntries } from '../../lib/habits'

const DURATION_OPTIONS = [15, 30, 45, 60, 90]

const formatTotal = (minutes) => {
  if (!minutes) return '0 min'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes - h * 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export default function ExerciseCard({ habit, value, canEdit, exerciseTypes, onChange }) {
  const entries = getExerciseEntries(value)
  const total = entries.reduce(
    (acc, e) => acc + (Number.isFinite(e.duration_minutes) ? e.duration_minutes : 0),
    0,
  )

  // mode: 'idle' | 'picking-type' | 'picking-duration'
  // stagedType holds the type chosen during picking-duration
  const [mode, setMode] = useState('idle')
  const [stagedType, setStagedType] = useState('')

  const open = () => {
    if (!canEdit) return
    setStagedType('')
    setMode('picking-type')
  }

  const cancel = () => {
    setStagedType('')
    setMode('idle')
  }

  const handleSelectType = (type) => {
    setStagedType(type)
    setMode('picking-duration')
  }

  const handleSelectDuration = (durationMinutes) => {
    if (!stagedType) return
    const next = [...entries, { type: stagedType, duration_minutes: durationMinutes }]
    onChange({ completed: next.length > 0, entries: next })
    cancel()
  }

  const handleRemove = (idx) => {
    const next = entries.filter((_, i) => i !== idx)
    onChange({ completed: next.length > 0, entries: next })
  }

  const headerOnClick = () => {
    if (entries.length === 0) {
      // Empty state: tap header to open the picker
      open()
    } else if (canEdit && mode !== 'idle') {
      cancel()
    }
  }

  const showPicker = canEdit && (mode === 'picking-type' || (entries.length === 0 && mode === 'picking-type'))
  const showDurationPicker = canEdit && mode === 'picking-duration' && stagedType

  return (
    <div
      className="habit-card"
      style={{
        background: colors.surface,
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 8,
        border: `1px solid ${entries.length > 0 ? habit.color + '33' : colors.border}`,
        opacity: canEdit ? 1 : 0.5,
      }}
    >
      <div
        onClick={headerOnClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: canEdit && entries.length === 0 ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
          <span style={{ fontSize: 22 }}>{habit.icon}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: entries.length > 0 ? habit.color : colors.textDim }}>
              {habit.label}
            </div>
            {entries.length === 0 && (
              <div style={{ fontSize: 12, color: colors.textFaint }}>{habit.desc}</div>
            )}
            {entries.length > 0 && (
              <div data-testid="entries-total" style={{ fontSize: 12, color: colors.textFaint }}>
                {`Total: ${formatTotal(total)} \u00B7 ${entries.length} ${entries.length === 1 ? 'activity' : 'activities'}`}
              </div>
            )}
          </div>
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: entries.length > 0 ? habit.color : colors.surfaceHover,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            transition: 'all 0.2s ease',
          }}
        >
          {entries.length > 0 ? '\u2713' : '\u25BE'}
        </div>
      </div>

      {/* Existing entries — list with remove */}
      {entries.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map((entry, idx) => (
            <div
              key={`${entry.type}-${idx}`}
              data-testid={`entry-row-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                background: colors.surfaceHover,
                borderRadius: 8,
              }}
            >
              <div style={{ fontSize: 13, color: colors.text }}>
                <span style={{ fontWeight: 600 }}>{entry.type}</span>
                {Number.isFinite(entry.duration_minutes) && (
                  <span style={{ color: colors.textFaint }}>{` \u00B7 ${entry.duration_minutes} min`}</span>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  data-testid={`entry-remove-${idx}`}
                  onClick={(e) => { e.stopPropagation(); handleRemove(idx) }}
                  aria-label={`Remove ${entry.type}`}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'transparent',
                    color: colors.textFaint,
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  {'\u00D7'}
                </button>
              )}
            </div>
          ))}

          {canEdit && mode === 'idle' && (
            <button
              type="button"
              data-testid="entry-add-another"
              onClick={open}
              style={{
                marginTop: 4,
                padding: '8px 10px',
                background: 'transparent',
                color: habit.color,
                border: `1px dashed ${habit.color}66`,
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: fonts.body,
                fontWeight: 600,
              }}
            >
              + Add another
            </button>
          )}
        </div>
      )}

      {/* Type picker */}
      {showPicker && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {exerciseTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSelectType(type)}
                data-testid={`exercise-option-${type}`}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: fonts.body,
                  fontWeight: 600,
                  background: colors.surfaceHover,
                  color: colors.textMuted,
                }}
              >
                {type}
              </button>
            ))}
            <button
              type="button"
              onClick={cancel}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${colors.borderSubtle}`,
                cursor: 'pointer',
                fontSize: 12,
                fontFamily: fonts.body,
                background: 'transparent',
                color: colors.textGhost,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Duration picker — only when a type is staged */}
      {showDurationPicker && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              fontSize: 11,
              color: colors.textFaint,
              marginBottom: 4,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Duration for {stagedType}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {DURATION_OPTIONS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => handleSelectDuration(min)}
                data-testid={`duration-${min}`}
                style={{
                  padding: '5px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: fonts.body,
                  fontWeight: 600,
                  background: colors.surfaceHover,
                  color: colors.textMuted,
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v > 0) handleSelectDuration(v)
                }
              }}
              onBlur={(e) => {
                const v = parseInt(e.target.value, 10)
                if (!isNaN(v) && v > 0) handleSelectDuration(v)
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 70,
                padding: '5px 8px',
                borderRadius: 8,
                fontSize: 12,
                fontFamily: fonts.body,
                fontWeight: 600,
                textAlign: 'center',
                background: colors.surfaceHover,
                color: colors.text,
                border: `1px solid ${colors.borderSubtle}`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
