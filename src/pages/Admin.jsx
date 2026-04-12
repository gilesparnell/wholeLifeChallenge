import { useState, useEffect } from 'react'
import { getConfig, setConfig, DEFAULT_CONFIG } from '../lib/adminConfig'
import { generateSampleData } from '../lib/sampleData'
import { useData } from '../contexts/DataContext'
import { getAllDates } from '../lib/dates'
import { colors, fonts } from '../styles/theme'

export default function Admin() {
  const { saveDay, clearAll } = useData()
  const [config, setLocalConfig] = useState(DEFAULT_CONFIG)
  const [newExercise, setNewExercise] = useState('')
  const [newMobilize, setNewMobilize] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setLocalConfig(getConfig())
  }, [])

  const saveAll = (updated) => {
    setLocalConfig(updated)
    setConfig(updated)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const addExerciseType = () => {
    if (newExercise.trim() && !config.exerciseTypes.includes(newExercise.trim())) {
      saveAll({ ...config, exerciseTypes: [...config.exerciseTypes, newExercise.trim()] })
      setNewExercise('')
    }
  }

  const removeExerciseType = (type) => {
    saveAll({ ...config, exerciseTypes: config.exerciseTypes.filter((t) => t !== type) })
  }

  const addMobilizeType = () => {
    if (newMobilize.trim() && !config.mobilizeTypes.includes(newMobilize.trim())) {
      saveAll({ ...config, mobilizeTypes: [...config.mobilizeTypes, newMobilize.trim()] })
      setNewMobilize('')
    }
  }

  const removeMobilizeType = (type) => {
    saveAll({ ...config, mobilizeTypes: config.mobilizeTypes.filter((t) => t !== type) })
  }

  const setHydrationTarget = (val) => {
    const ml = parseInt(val, 10)
    if (!isNaN(ml) && ml > 0) {
      saveAll({ ...config, hydrationTargetMl: ml })
    }
  }

  const resetToDefaults = () => {
    if (confirm('Reset all admin settings to defaults?')) {
      saveAll({ ...DEFAULT_CONFIG })
    }
  }

  const cardStyle = {
    background: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16,
    border: `1px solid ${colors.border}`,
  }

  const labelStyle = {
    fontSize: 13, fontWeight: 700, color: colors.accent, textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: 10, display: 'block',
  }

  const tagStyle = (color) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
    background: `${color}22`, color: color, marginRight: 6, marginBottom: 6,
  })

  const inputStyle = {
    flex: 1, background: colors.surfaceHover, border: `1px solid ${colors.borderSubtle}`,
    borderRadius: 8, padding: '8px 12px', color: colors.text, fontSize: 13,
    fontFamily: fonts.body,
  }

  const btnStyle = {
    background: colors.accent, border: 'none', borderRadius: 8, padding: '8px 16px',
    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: fonts.body,
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 300, marginBottom: 8, textAlign: 'center' }}>
        Admin Console
      </h2>
      <p style={{ fontSize: 12, color: colors.textDim, textAlign: 'center', marginBottom: 24 }}>
        Configure challenge settings
      </p>

      {saved && (
        <div style={{
          background: colors.nutritionGood, borderRadius: 10, padding: '10px 16px', marginBottom: 16,
          color: colors.nutritionGoodText, fontSize: 13, fontWeight: 600, textAlign: 'center',
        }}>
          Settings saved
        </div>
      )}

      {/* Exercise Types */}
      <div style={cardStyle}>
        <label style={labelStyle}>Exercise Types</label>
        <div style={{ marginBottom: 10 }}>
          {config.exerciseTypes.map((type) => (
            <span key={type} style={tagStyle('#E8634A')}>
              {type}
              <button
                onClick={() => removeExerciseType(type)}
                style={{ background: 'none', border: 'none', color: '#E8634A', cursor: 'pointer', fontSize: 14, padding: 0 }}
              >
                {'\u2715'}
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newExercise}
            onChange={(e) => setNewExercise(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addExerciseType()}
            placeholder="Add exercise type..."
            style={inputStyle}
          />
          <button onClick={addExerciseType} style={btnStyle}>Add</button>
        </div>
      </div>

      {/* Mobilise Types */}
      <div style={cardStyle}>
        <label style={labelStyle}>Mobilize Types</label>
        <div style={{ marginBottom: 10 }}>
          {config.mobilizeTypes.map((type) => (
            <span key={type} style={tagStyle('#E8A34A')}>
              {type}
              <button
                onClick={() => removeMobilizeType(type)}
                style={{ background: 'none', border: 'none', color: '#E8A34A', cursor: 'pointer', fontSize: 14, padding: 0 }}
              >
                {'\u2715'}
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newMobilize}
            onChange={(e) => setNewMobilize(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addMobilizeType()}
            placeholder="Add mobilize type..."
            style={inputStyle}
          />
          <button onClick={addMobilizeType} style={btnStyle}>Add</button>
        </div>
      </div>

      {/* Hydration Target */}
      <div style={cardStyle}>
        <label style={labelStyle}>Default Hydration Target</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[1500, 2000, 2500, 3000, 3500].map((ml) => (
            <button
              key={ml}
              onClick={() => setHydrationTarget(ml)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: fonts.body, fontWeight: 700,
                background: config.hydrationTargetMl === ml ? colors.blue : colors.surfaceHover,
                color: config.hydrationTargetMl === ml ? '#fff' : colors.textMuted,
              }}
            >
              {ml} ml
            </button>
          ))}
          <input
            type="number"
            min="500"
            max="10000"
            step="100"
            placeholder="Custom"
            value={![1500, 2000, 2500, 3000, 3500].includes(config.hydrationTargetMl) ? config.hydrationTargetMl : ''}
            onChange={(e) => setHydrationTarget(e.target.value)}
            style={{ ...inputStyle, width: 90 }}
          />
        </div>
        <p style={{ fontSize: 12, color: colors.textGhost, marginTop: 8 }}>
          Current: {config.hydrationTargetMl} ml
        </p>
        <label style={{ ...labelStyle, marginTop: 16 }}>Hydration Increment</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {[100, 150, 200, 250, 300, 500].map((ml) => (
            <button
              key={ml}
              onClick={() => saveAll({ ...config, hydrationIncrementMl: ml })}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: fonts.body, fontWeight: 700,
                background: config.hydrationIncrementMl === ml ? colors.blue : colors.surfaceHover,
                color: config.hydrationIncrementMl === ml ? '#fff' : colors.textMuted,
              }}
            >
              {ml} ml
            </button>
          ))}
          <input
            type="number"
            min="50"
            max="1000"
            step="50"
            placeholder="Custom"
            value={![100, 150, 200, 250, 300, 500].includes(config.hydrationIncrementMl) ? config.hydrationIncrementMl : ''}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!isNaN(v) && v > 0) saveAll({ ...config, hydrationIncrementMl: v })
            }}
            style={{ ...inputStyle, width: 90 }}
          />
        </div>
        <p style={{ fontSize: 12, color: colors.textGhost, marginTop: 8 }}>
          Current: +{config.hydrationIncrementMl} ml per tap
        </p>
      </div>

      {/* Challenge Settings */}
      <div style={cardStyle}>
        <label style={labelStyle}>Challenge Settings</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Start Date</div>
            <input
              type="date"
              value={config.challengeStart || '2026-04-12'}
              onChange={(e) => saveAll({ ...config, challengeStart: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>Duration (days)</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {[42, 60, 75, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => saveAll({ ...config, challengeDays: d })}
                  style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontFamily: fonts.body, fontWeight: 700,
                    background: (config.challengeDays || 75) === d ? colors.accent : colors.surfaceHover,
                    color: (config.challengeDays || 75) === d ? '#fff' : colors.textMuted,
                  }}
                >
                  {d}
                </button>
              ))}
              <input
                type="number"
                min="7"
                max="365"
                placeholder="Custom"
                value={![42, 60, 75, 90].includes(config.challengeDays || 75) ? config.challengeDays : ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!isNaN(v) && v > 0) saveAll({ ...config, challengeDays: v })
                }}
                style={{ ...inputStyle, width: 90 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sample Data */}
      <div style={cardStyle}>
        <label style={labelStyle}>Sample Data</label>
        <p style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
          Load 30 days of realistic sample data for testing charts and reports.
        </p>
        <button
          onClick={async () => {
            if (confirm('Load 30 days of sample data? This will replace any existing check-in data.')) {
              const sample = generateSampleData(30)
              const allDates = getAllDates()
              for (const date of allDates) {
                if (sample[date]) {
                  await saveDay(date, sample[date])
                }
              }
              setSaved(true)
              setTimeout(() => setSaved(false), 2000)
            }
          }}
          style={btnStyle}
        >
          Load Sample Data
        </button>
      </div>

      {/* Reset */}
      <div style={{ textAlign: 'center', marginTop: 24, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={resetToDefaults} style={{
          background: 'none', border: `1px solid ${colors.borderSubtle}`, borderRadius: 8,
          padding: '8px 16px', color: colors.textGhost, fontSize: 12, cursor: 'pointer',
          fontFamily: fonts.body,
        }}>
          Reset Settings
        </button>
        <button onClick={() => {
          if (confirm('Clear all check-in data? This cannot be undone.')) {
            clearAll()
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
          }
        }} style={{
          background: 'none', border: `1px solid ${colors.borderSubtle}`, borderRadius: 8,
          padding: '8px 16px', color: colors.textGhost, fontSize: 12, cursor: 'pointer',
          fontFamily: fonts.body,
        }}>
          Clear All Data
        </button>
      </div>
    </div>
  )
}
