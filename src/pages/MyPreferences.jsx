import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile } from '../lib/profiles'
import {
  getConfig,
  sanitisePreferences,
  PERSONALISABLE_KEYS,
} from '../lib/adminConfig'
import { colors, fonts } from '../styles/theme'
import { track } from '../lib/analytics'

const FIELD_META = {
  hydrationTargetMl: {
    label: 'Water target (ml)',
    help: 'How much water you want to drink in a day. The hydration card on the daily check-in fills this up.',
    min: 500,
    max: 10000,
    step: 50,
  },
  hydrationIncrementMl: {
    label: 'Water tap increment (ml)',
    help: 'How much each tap on the + / − buttons adds or removes.',
    min: 100,
    max: 1000,
    step: 25,
  },
  sleepTargetHours: {
    label: 'Sleep target (hours)',
    help: 'Your personal sleep goal. Drives the target band on the sleep chart.',
    min: 4,
    max: 14,
    step: 0.5,
  },
}

export default function MyPreferences() {
  const { profile, updateLocalProfile } = useAuth()
  const globalConfig = useMemo(() => getConfig(), [])

  // Seed form state from the user's existing preferences, falling back to
  // the global config for any field the user hasn't overridden yet.
  const initialValues = useMemo(() => {
    const prefs = profile?.preferences || {}
    const seed = {}
    for (const key of PERSONALISABLE_KEYS) {
      seed[key] = key in prefs ? prefs[key] : globalConfig[key]
    }
    return seed
  }, [profile, globalConfig])

  const [values, setValues] = useState(initialValues)
  const [saveState, setSaveState] = useState('idle') // idle | saving | saved | error

  const handleChange = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }))
    if (saveState !== 'idle') setSaveState('idle')
  }

  const handleReset = () => {
    const reset = {}
    for (const key of PERSONALISABLE_KEYS) reset[key] = globalConfig[key]
    setValues(reset)
    setSaveState('idle')
  }

  const handleSave = async () => {
    if (!profile?.id) return
    setSaveState('saving')

    // Only persist values that actually differ from the global default — no
    // point storing a duplicate. sanitisePreferences strips junk + range-checks.
    const sanitised = sanitisePreferences(values)
    const diff = {}
    for (const [key, value] of Object.entries(sanitised)) {
      if (value !== globalConfig[key]) diff[key] = value
    }

    const result = await updateProfile(profile.id, { preferences: diff })
    if (!result) {
      setSaveState('error')
      return
    }
    updateLocalProfile({ preferences: diff })
    track('preferences_saved', { fields: Object.keys(diff).length })
    setSaveState('saved')
  }

  return (
    <div>
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: 24,
          fontWeight: 400,
          marginBottom: 6,
          color: colors.text,
        }}
      >
        My Preferences
      </h2>
      <p
        style={{
          fontSize: 13,
          color: colors.textDim,
          marginBottom: 24,
          lineHeight: 1.5,
        }}
      >
        Tailor a few things to you. The admin sets sensible defaults for everyone;
        anything you change here only affects your own view. Reset to defaults any time.
      </p>

      {PERSONALISABLE_KEYS.map((key) => {
        const meta = FIELD_META[key]
        const isOverridden =
          profile?.preferences && key in profile.preferences &&
          profile.preferences[key] !== globalConfig[key]
        return (
          <div
            key={key}
            style={{
              background: colors.surface,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              border: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <label
              htmlFor={`pref-${key}`}
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 600,
                color: colors.text,
                marginBottom: 4,
              }}
            >
              {meta.label}
              {isOverridden && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 10,
                    fontWeight: 500,
                    color: colors.accent,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Override
                </span>
              )}
            </label>
            <p
              style={{
                fontSize: 11,
                color: colors.textFaint,
                marginBottom: 8,
                lineHeight: 1.4,
              }}
            >
              {meta.help} Default: {globalConfig[key]}
            </p>
            <input
              id={`pref-${key}`}
              type="number"
              min={meta.min}
              max={meta.max}
              step={meta.step}
              value={values[key] ?? ''}
              onChange={handleChange(key)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 16,
                fontFamily: fonts.body,
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.text,
              }}
            />
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState === 'saving'}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: colors.accent,
            color: colors.bg,
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: fonts.body,
            cursor: saveState === 'saving' ? 'not-allowed' : 'pointer',
            opacity: saveState === 'saving' ? 0.6 : 1,
          }}
        >
          {saveState === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{
            padding: '12px 16px',
            background: 'transparent',
            color: colors.textDim,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: fonts.body,
            cursor: 'pointer',
          }}
        >
          Reset to defaults
        </button>
      </div>

      {saveState === 'saved' && (
        <p
          role="status"
          style={{
            marginTop: 12,
            fontSize: 12,
            color: colors.accent,
            textAlign: 'center',
          }}
        >
          Saved. Your preferences will apply everywhere in the app.
        </p>
      )}
      {saveState === 'error' && (
        <p
          role="alert"
          style={{
            marginTop: 12,
            fontSize: 12,
            color: colors.danger || '#dc2626',
            textAlign: 'center',
          }}
        >
          Couldn&apos;t save — check your connection and try again.
        </p>
      )}
    </div>
  )
}
