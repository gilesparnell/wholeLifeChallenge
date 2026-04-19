import { useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile } from '../lib/profiles'
import {
  getConfig,
  sanitisePreferences,
  PERSONALISABLE_KEYS,
} from '../lib/adminConfig'
import {
  getPermission,
  requestPermission,
  isNotificationSupported,
} from '../lib/browserNotifications'
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

// Only the numeric fields are batch-saved via the Save button.
// Boolean preferences (e.g. notificationsEnabled) save immediately on
// change and are rendered in their own section.
const NUMERIC_KEYS = PERSONALISABLE_KEYS.filter((k) => FIELD_META[k])

const buildDiff = (rawValues, globalConfig) => {
  const sanitised = sanitisePreferences(rawValues)
  const diff = {}
  for (const [key, value] of Object.entries(sanitised)) {
    if (value !== globalConfig[key]) diff[key] = value
  }
  return diff
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
  const [permission, setPermission] = useState(() =>
    isNotificationSupported() ? getPermission() : 'unsupported',
  )

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

    const diff = buildDiff(values, globalConfig)

    const result = await updateProfile(profile.id, { preferences: diff })
    if (!result) {
      setSaveState('error')
      return
    }
    updateLocalProfile({ preferences: diff })
    track('preferences_saved', { fields: Object.keys(diff).length })
    setSaveState('saved')
  }

  const handleToggleNotifications = async (e) => {
    if (!profile?.id) return
    const next = e.target.checked
    const nextValues = { ...values, notificationsEnabled: next }
    setValues(nextValues)

    const diff = buildDiff(nextValues, globalConfig)
    const result = await updateProfile(profile.id, { preferences: diff })
    if (result) {
      updateLocalProfile({ preferences: diff })
      track('notifications_toggled', { enabled: next })
    }

    // When toggling ON and permission is still default, this click is a
    // legitimate user gesture, so we can prompt without a separate step.
    if (next && isNotificationSupported() && getPermission() === 'default') {
      const res = await requestPermission()
      setPermission(res)
    }
  }

  const handleToggleSelfNotify = async (e) => {
    if (!profile?.id) return
    const next = e.target.checked
    const nextValues = { ...values, notifyOnOwnActivity: next }
    setValues(nextValues)

    const diff = buildDiff(nextValues, globalConfig)
    const result = await updateProfile(profile.id, { preferences: diff })
    if (result) {
      updateLocalProfile({ preferences: diff })
      track('self_notify_toggled', { enabled: next })
    }
  }

  const handleGrantPermission = async () => {
    if (!isNotificationSupported()) return
    const res = await requestPermission()
    setPermission(res)
  }

  const notificationsOn = values.notificationsEnabled !== false
  const selfNotifyOn = values.notifyOnOwnActivity === true
  const showGrantButton =
    notificationsOn &&
    isNotificationSupported() &&
    permission === 'default'
  const showDeniedHelper = notificationsOn && permission === 'denied'

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

      {/* Notifications section — saves immediately on toggle */}
      <div
        style={{
          background: colors.surface,
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          border: `1px solid ${colors.borderSubtle}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 6,
          }}
        >
          <label
            htmlFor="pref-notifications"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: colors.text,
            }}
          >
            Notifications
          </label>
          <input
            id="pref-notifications"
            aria-label="Notifications"
            type="checkbox"
            checked={notificationsOn}
            onChange={handleToggleNotifications}
            style={{ width: 18, height: 18, cursor: 'pointer' }}
          />
        </div>
        <p
          style={{
            fontSize: 11,
            color: colors.textFaint,
            lineHeight: 1.4,
            marginBottom: showGrantButton || showDeniedHelper ? 10 : 0,
          }}
        >
          When anyone in the challenge completes an activity, your device will
          ping with a quiet &ldquo;Someone special&rdquo; celebration. Opt out
          any time.
        </p>
        {showGrantButton && (
          <button
            type="button"
            onClick={handleGrantPermission}
            style={{
              padding: '8px 12px',
              background: colors.accent,
              color: colors.bg,
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              fontFamily: fonts.body,
              cursor: 'pointer',
            }}
          >
            Grant browser permission
          </button>
        )}
        {showDeniedHelper && (
          <p
            style={{
              fontSize: 11,
              color: colors.textDim,
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            Your browser has blocked notifications for this site. Enable them
            via your browser settings to start receiving celebrations.
          </p>
        )}

        {/* Self-notify (test mode) — shown whenever the top toggle is on */}
        {notificationsOn && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 14,
              paddingTop: 12,
              borderTop: `1px solid ${colors.borderSubtle}`,
            }}
          >
            <label
              htmlFor="pref-self-notify"
              style={{
                fontSize: 12,
                color: colors.textDim,
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              <span style={{ display: 'block', fontWeight: 600, color: colors.text, marginBottom: 2 }}>
                Also notify me of my own activity
              </span>
              Test mode &mdash; shows the celebration to you too, so you can
              verify the feature without a second person logged in.
            </label>
            <input
              id="pref-self-notify"
              aria-label="Also notify me of my own activity"
              type="checkbox"
              checked={selfNotifyOn}
              onChange={handleToggleSelfNotify}
              style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0 }}
            />
          </div>
        )}
      </div>

      <p
        style={{
          fontSize: 12,
          color: colors.textDim,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        Targets
      </p>

      {NUMERIC_KEYS.map((key) => {
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
