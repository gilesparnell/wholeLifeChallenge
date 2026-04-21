import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile, listShareableProfiles } from '../lib/profiles'
import { listShares, addShare, removeShare } from '../lib/shareRepo'
import {
  getConfig,
  sanitisePreferences,
  PERSONALISABLE_KEYS,
} from '../lib/adminConfig'
import {
  getPermission,
  requestPermission,
  isNotificationSupported,
  showNotification,
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

    // Toggling ON is a user gesture — prompt for browser permission if
    // it's still default, otherwise showNotification will silently
    // no-op and the user won't see their own test notifications.
    if (next && isNotificationSupported() && getPermission() === 'default') {
      const res = await requestPermission()
      setPermission(res)
    }
  }

  // --- Sharing state ---
  const [shareablePeople, setShareablePeople] = useState([])
  const [shares, setShares] = useState([]) // rows of entry_shares for this owner

  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false
    Promise.all([listShareableProfiles(), listShares(profile.id)]).then(
      ([people, rows]) => {
        if (cancelled) return
        setShareablePeople(people)
        setShares(rows)
      },
    )
    return () => { cancelled = true }
  }, [profile?.id])

  const hasShare = (viewerId, scope) =>
    shares.some((s) => s.viewer_id === viewerId && s.scope === scope)

  const togglePersonShare = async (viewerId, scope, next) => {
    if (!profile?.id) return
    if (next) {
      const ok = await addShare({ ownerId: profile.id, viewerId, scope })
      if (ok) {
        setShares((rows) => [...rows, { owner_id: profile.id, viewer_id: viewerId, scope }])
        track('share_granted', { scope })
      }
    } else {
      const ok = await removeShare({ ownerId: profile.id, viewerId, scope })
      if (ok) {
        setShares((rows) =>
          rows.filter((r) => !(r.viewer_id === viewerId && r.scope === scope)),
        )
        track('share_revoked', { scope })
      }
    }
  }

  const toggleShareAll = async (key, next) => {
    if (!profile?.id) return
    const nextValues = { ...values, [key]: next }
    setValues(nextValues)
    const diff = buildDiff(nextValues, globalConfig)
    const result = await updateProfile(profile.id, { preferences: diff })
    if (result) {
      updateLocalProfile({ preferences: diff })
      track('share_all_toggled', { key, enabled: next })
    }
  }

  const shareWellnessAll = values.share_wellness_all === true
  const shareJournalAll = values.share_journal_all === true
  const shareExerciseAll = values.share_exercise_all === true

  const [testState, setTestState] = useState('idle') // idle | sending | sent | failed

  const handleTestNotification = async () => {
    setTestState('sending')
    const ok = await showNotification({
      title: 'Whole Life Challenge',
      body: 'Test notification \u2014 if you can see this, notifications are working.',
      tag: `wlc-test-${Date.now()}`,
    })
    setTestState(ok ? 'sent' : 'failed')
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
  const showTestButton =
    notificationsOn &&
    isNotificationSupported() &&
    permission === 'granted'

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
        {showTestButton && (
          <div style={{ marginTop: showGrantButton ? 10 : 0 }}>
            <button
              type="button"
              onClick={handleTestNotification}
              disabled={testState === 'sending'}
              style={{
                padding: '8px 12px',
                background: 'transparent',
                color: colors.accent,
                border: `1px solid ${colors.accent}`,
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: fonts.body,
                cursor: testState === 'sending' ? 'not-allowed' : 'pointer',
                opacity: testState === 'sending' ? 0.6 : 1,
              }}
            >
              {testState === 'sending' ? 'Sending\u2026' : 'Send test notification'}
            </button>
            {testState === 'sent' && (
              <p
                role="status"
                style={{
                  fontSize: 11,
                  color: colors.accent,
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                Sent &mdash; check your device.
              </p>
            )}
            {testState === 'failed' && (
              <p
                role="alert"
                style={{
                  fontSize: 11,
                  color: colors.danger || '#dc2626',
                  marginTop: 6,
                  marginBottom: 0,
                }}
              >
                Couldn&rsquo;t send the test notification. Permission may have
                been blocked.
              </p>
            )}
          </div>
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

      {/* Sharing section */}
      <p
        style={{
          fontSize: 12,
          color: colors.textDim,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          fontWeight: 600,
          marginBottom: 10,
          marginTop: 8,
        }}
      >
        Sharing
      </p>
      <p
        style={{
          fontSize: 12,
          color: colors.textFaint,
          lineHeight: 1.5,
          marginBottom: 12,
        }}
      >
        Everything below is <strong>opt-in</strong> and off by default. Share
        your reflection journal or wellness insights with specific people in
        the cohort — or toggle &ldquo;everyone&rdquo; if that&rsquo;s simpler.
        Nutrition, exercise, and hydration detail stay private.
      </p>

      {[
        {
          scope: 'journal',
          title: 'Share my reflection journal',
          help: 'The written reflection you add each day — not the score.',
          allKey: 'share_journal_all',
          allValue: shareJournalAll,
        },
        {
          scope: 'wellness',
          title: 'Share my wellness insights',
          help: 'Sleep hours, wellbeing score, and the &ldquo;How Do You Feel&rdquo; scales.',
          allKey: 'share_wellness_all',
          allValue: shareWellnessAll,
        },
        {
          scope: 'exercise',
          title: 'Share my exercise &amp; mobility activity',
          help: 'Activity types (e.g. Running, Swimming, Yoga) and minutes per session. Nutrition and hydration stay private.',
          allKey: 'share_exercise_all',
          allValue: shareExerciseAll,
        },
      ].map((block) => (
        <div
          key={block.scope}
          style={{
            background: colors.surface,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            border: `1px solid ${colors.borderSubtle}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <label
              htmlFor={`pref-${block.allKey}`}
              style={{ fontSize: 13, fontWeight: 600, color: colors.text }}
            >
              {block.title}
            </label>
          </div>
          <p
            style={{ fontSize: 11, color: colors.textFaint, lineHeight: 1.4, marginBottom: 10 }}
            dangerouslySetInnerHTML={{ __html: block.help }}
          />
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              background: colors.bg,
              border: `1px solid ${colors.borderSubtle}`,
              cursor: 'pointer',
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>
              Share with all active users
            </span>
            <input
              id={`pref-${block.allKey}`}
              data-testid={`share-all-${block.scope}`}
              type="checkbox"
              checked={block.allValue}
              onChange={(e) => toggleShareAll(block.allKey, e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
          </label>
          {!block.allValue && (
            <div>
              <p style={{ fontSize: 11, color: colors.textFaint, marginBottom: 8 }}>
                …or share with specific people:
              </p>
              {shareablePeople.length === 0 ? (
                <p style={{ fontSize: 12, color: colors.textGhost, margin: 0 }}>
                  No other active users yet.
                </p>
              ) : (
                shareablePeople.map((person) => {
                  const checked = hasShare(person.id, block.scope)
                  return (
                    <label
                      key={person.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        color: colors.textMuted,
                      }}
                    >
                      <span>{person.display_name || 'Unnamed'}</span>
                      <input
                        data-testid={`share-${block.scope}-${person.id}`}
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => togglePersonShare(person.id, block.scope, e.target.checked)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </label>
                  )
                })
              )}
            </div>
          )}
          {block.allValue && (
            <p
              style={{
                fontSize: 11,
                color: colors.textFaint,
                margin: 0,
                fontStyle: 'italic',
              }}
            >
              Shared with every active user. Turn the switch off to pick
              specific people instead.
            </p>
          )}
        </div>
      ))}

      <p
        style={{
          fontSize: 12,
          color: colors.textDim,
          textTransform: 'uppercase',
          letterSpacing: 1.5,
          fontWeight: 600,
          marginBottom: 10,
          marginTop: 8,
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
