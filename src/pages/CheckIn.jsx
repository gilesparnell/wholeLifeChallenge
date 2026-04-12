import { useState, useCallback } from 'react'
import { HABITS, emptyDay } from '../lib/habits'
import { scoreDay, calculateStreak, calculateHabitStreak } from '../lib/scoring'
import { getDayIndex, getToday, getAllDates, formatDate, CHALLENGE_DAYS } from '../lib/dates'
import { getConfig } from '../lib/adminConfig'
import { computeBonuses } from '../lib/bonuses'
import { calculateRecoveryScore, calculateStrainScore } from '../lib/recovery'
import { getContextAwarePrompt } from '../lib/promptBank'
import { useData } from '../contexts/DataContext'
import { colors, fonts } from '../styles/theme'
import ExerciseCard from '../components/habits/ExerciseCard'
import SleepCard from '../components/habits/SleepCard'
import HydrateCard from '../components/habits/HydrateCard'
import ActivityModal from '../components/modals/ActivityModal'

export default function CheckIn() {
  const { data, loading, saveDay: save, clearAll } = useData()
  const [selectedDate, setSelectedDate] = useState(getToday())
  const [modalOpen, setModalOpen] = useState(null) // 'wellbeing' | 'reflect' | null
  const config = getConfig()

  const today = getToday()
  const dayIndex = getDayIndex(today)
  const currentDay = data[selectedDate] || emptyDay()
  const allDates = getAllDates()
  const selDayIndex = getDayIndex(selectedDate)
  const canEdit = selDayIndex >= 0 && selDayIndex <= dayIndex && selDayIndex < CHALLENGE_DAYS

  const updateHabit = (habitId, value) => {
    save(selectedDate, { ...currentDay, [habitId]: value })
  }

  const setNutrition = (val) => {
    save(selectedDate, { ...currentDay, nutrition: val })
  }

  const handleModalSave = (habitId, text) => {
    if (habitId === 'reflect') {
      const reflectObj = { completed: text.length > 0, reflection_text: text }
      save(selectedDate, { ...currentDay, reflect: reflectObj, reflection: text })
    } else if (habitId === 'wellbeing') {
      const wellbeingObj = { completed: text.length > 0, activity_text: text }
      save(selectedDate, { ...currentDay, wellbeing: wellbeingObj })
    }
  }

  const isHabitDone = (habit) => {
    const val = currentDay[habit.id]
    if (typeof val === 'boolean') return val
    if (val && typeof val === 'object') return !!val.completed
    return false
  }

  const totalScore = Object.entries(data).reduce((sum, [k, v]) => {
    const idx = getDayIndex(k)
    if (idx >= 0 && idx < CHALLENGE_DAYS) return sum + scoreDay(v)
    return sum
  }, 0)

  const maxPossible = Math.max(1, Math.min(dayIndex + 1, CHALLENGE_DAYS)) * 35
  const pct = Math.round((totalScore / maxPossible) * 100)
  const streak = calculateStreak(data, allDates, dayIndex)
  const bonuses = computeBonuses(data, allDates, dayIndex)

  const BONUS_CONFIG = [
    { key: 'indulgence', label: 'Indulgence', icon: '\u{1F37D}\uFE0F', color: colors.green },
    { key: 'restDay', label: 'Rest Day', icon: '\u{1F6CC}', color: colors.blue },
    { key: 'nightOwl', label: 'Night Owl', icon: '\u{1F989}', color: colors.purple },
    { key: 'freeDay', label: 'Free Day', icon: '\u{1F31F}', color: colors.orange },
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: colors.textDim }}>
        <p style={{ fontFamily: fonts.display, fontSize: 20 }}>Loading...</p>
      </div>
    )
  }

  const renderHabitCard = (habit) => {
    const value = currentDay[habit.id]

    switch (habit.type) {
      case 'dropdown':
        return (
          <ExerciseCard
            key={habit.id}
            habit={habit}
            value={value}
            canEdit={canEdit}
            exerciseTypes={habit.id === 'exercise' ? config.exerciseTypes : config.mobilizeTypes}
            onChange={(v) => updateHabit(habit.id, v)}
          />
        )
      case 'hours':
        return (
          <SleepCard
            key={habit.id}
            habit={habit}
            value={value}
            canEdit={canEdit}
            onChange={(v) => updateHabit(habit.id, v)}
          />
        )
      case 'increment':
        return (
          <HydrateCard
            key={habit.id}
            habit={habit}
            value={{ ...value, target_ml: config.hydrationTargetMl }}
            incrementMl={config.hydrationIncrementMl}
            canEdit={canEdit}
            onChange={(v) => updateHabit(habit.id, v)}
          />
        )
      case 'modal': {
        const done = isHabitDone(habit)
        return (
          <div
            key={habit.id}
            className="habit-card"
            onClick={() => canEdit && setModalOpen(habit.id)}
            style={{
              background: colors.surface, borderRadius: 14, padding: '14px 16px', marginBottom: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: `1px solid ${done ? habit.color + '33' : colors.border}`,
              cursor: canEdit ? 'pointer' : 'default',
              opacity: canEdit ? 1 : 0.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>{habit.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: done ? habit.color : colors.textDim }}>{habit.label}</div>
                <div style={{ fontSize: 12, color: colors.textFaint }}>
                  {done ? 'Logged' : habit.desc}
                </div>
              </div>
            </div>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: done ? habit.color : colors.surfaceHover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, transition: 'all 0.2s ease',
            }}>
              {done ? '\u2713' : '\u270E'}
            </div>
          </div>
        )
      }
      default:
        return null
    }
  }

  const getModalInitialText = () => {
    if (modalOpen === 'reflect') {
      return currentDay.reflect?.reflection_text ?? currentDay.reflection ?? ''
    }
    if (modalOpen === 'wellbeing') {
      return currentDay.wellbeing?.activity_text ?? ''
    }
    return ''
  }

  const modalHabit = modalOpen ? HABITS.find((h) => h.id === modalOpen) : null

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Today', value: scoreDay(currentDay), max: '/35', accent: colors.accent },
          { label: 'Total', value: totalScore, max: `/${maxPossible}`, accent: colors.blue },
          { label: 'Rate', value: `${pct}%`, max: '', accent: colors.green },
          { label: 'Streak', value: streak, max: '\u{1F525}', accent: colors.orange },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: colors.surface, borderRadius: 12, padding: '14px 8px', textAlign: 'center',
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ fontSize: 22, fontFamily: fonts.display, fontWeight: 700, color: s.accent }}>
              {s.value}<span style={{ fontSize: 12, color: colors.textGhost, fontWeight: 400 }}>{s.max}</span>
            </div>
            <div style={{ fontSize: 12, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Per-habit streaks */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {HABITS.map((h) => {
          const habitStreak = calculateHabitStreak(data, allDates, dayIndex, h.id)
          if (habitStreak === 0) return null
          return (
            <div key={h.id} style={{
              background: colors.surface, borderRadius: 8, padding: '4px 10px',
              border: `1px solid ${h.color}33`, display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 12 }}>{h.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: h.color }}>{habitStreak}</span>
            </div>
          )
        })}
      </div>

      {/* Date selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => {
          const d = new Date(selectedDate + 'T00:00:00')
          d.setDate(d.getDate() - 1)
          const prev = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (getDayIndex(prev) >= 0) setSelectedDate(prev)
        }} style={{ background: 'none', border: 'none', color: colors.textDim, fontSize: 20, cursor: 'pointer', padding: '4px 12px' }}>{'\u2190'}</button>
        <span style={{ fontSize: 14, fontWeight: 600, color: selectedDate === today ? colors.accent : colors.textMuted }}>
          {selectedDate === today ? 'Today' : formatDate(selectedDate)}
        </span>
        <button onClick={() => {
          const d = new Date(selectedDate + 'T00:00:00')
          d.setDate(d.getDate() + 1)
          const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          if (getDayIndex(next) <= dayIndex && getDayIndex(next) < CHALLENGE_DAYS) setSelectedDate(next)
        }} style={{ background: 'none', border: 'none', color: colors.textDim, fontSize: 20, cursor: 'pointer', padding: '4px 12px' }}>{'\u2192'}</button>
      </div>

      {/* Nutrition */}
      <div style={{
        background: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10,
        border: `1px solid ${currentDay.nutrition === 5 ? colors.nutritionGood : currentDay.nutrition >= 3 ? colors.nutritionMid : colors.nutritionBad}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{'\u{1F957}'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Nutrition</div>
              <div style={{ fontSize: 12, color: colors.textDim }}>
                Deduct per non-compliant food
                {' '}
                <a
                  href="https://www.wholelifechallenge.com/how-to-choose-your-whole-life-challenge-nutrition-level/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: colors.accent, textDecoration: 'none' }}
                >
                  (Levels Guide)
                </a>
              </div>
            </div>
          </div>
          <div style={{
            fontSize: 24, fontFamily: fonts.display, fontWeight: 700,
            color: currentDay.nutrition === 5 ? colors.green : currentDay.nutrition >= 3 ? colors.orange : colors.accent,
          }}>
            {currentDay.nutrition}
          </div>
        </div>
        {canEdit && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            {[5, 4, 3, 2, 1, 0].map((v) => (
              <button key={v} onClick={() => setNutrition(v)}
                style={{
                  width: 42, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: fonts.body, fontWeight: 700, fontSize: 14,
                  background: currentDay.nutrition === v ? (v >= 4 ? colors.nutritionGood : v >= 2 ? colors.nutritionMid : colors.nutritionBad) : colors.surfaceHover,
                  color: currentDay.nutrition === v ? (v >= 4 ? colors.nutritionGoodText : v >= 2 ? colors.nutritionMidText : colors.nutritionBadText) : colors.textFaint,
                }}>
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Habit Cards */}
      <div className="wlc-habits-grid">
        {HABITS.map((h) => renderHabitCard(h))}
      </div>

      {/* Self-Report (Recovery Metrics) */}
      {canEdit && (
        <div style={{
          background: colors.surface, borderRadius: 14, padding: 16, marginTop: 16,
          border: `1px solid ${colors.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2 }}>
              How Do You Feel?
            </p>
            {currentDay.selfReport && (() => {
              const recovery = calculateRecoveryScore(currentDay.selfReport)
              const strain = calculateStrainScore(currentDay.exercise, currentDay.mobilize)
              return recovery != null ? (
                <div style={{ display: 'flex', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: recovery >= 60 ? colors.green : recovery >= 30 ? colors.orange : colors.accent }}>
                    Recovery {recovery}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.blue }}>
                    Strain {strain}
                  </span>
                </div>
              ) : null
            })()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { key: 'sleepQuality', label: 'Sleep Quality', icon: '\u{1F634}' },
              { key: 'energyLevel', label: 'Energy', icon: '\u26A1' },
              { key: 'soreness', label: 'Soreness', icon: '\u{1F4AA}' },
              { key: 'stressLevel', label: 'Stress', icon: '\u{1F9E0}' },
              { key: 'mood', label: 'Mood', icon: '\u{1F60A}' },
            ].map(({ key, label, icon }) => {
              const sr = currentDay.selfReport || {}
              const val = sr[key] ?? 0
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ fontSize: 12, color: colors.textDim, minWidth: 55 }}>{label}</span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => {
                          const updated = { ...(currentDay.selfReport || {}), [key]: v, sleepHours: currentDay.sleep?.hours || 0 }
                          save(selectedDate, { ...currentDay, selfReport: updated })
                        }}
                        style={{
                          width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
                          fontSize: 11, fontWeight: 700, fontFamily: fonts.body,
                          background: val === v ? colors.accent : colors.surfaceHover,
                          color: val === v ? '#fff' : colors.textFaint,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Activity Modal for wellbeing/reflect */}
      <ActivityModal
        isOpen={modalOpen !== null}
        onClose={() => setModalOpen(null)}
        onSave={(text) => handleModalSave(modalOpen, text)}
        title={modalHabit?.label || ''}
        placeholder={modalOpen === 'reflect' ? 'How did today go?' : 'What did you do for well-being?'}
        initialText={getModalInitialText()}
        prompt={modalOpen === 'reflect' ? getContextAwarePrompt(
          getDayIndex(selectedDate),
          currentDay,
          { streak, recoveryScore: calculateRecoveryScore(currentDay.selfReport) }
        ) : null}
      />

      {/* Bonus Progress */}
      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, textAlign: 'center' }}>Bonus Tracker</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {BONUS_CONFIG.map(({ key, label, icon, color }) => {
            const bonus = bonuses[key]
            const pct = Math.round((bonus.streak / bonus.threshold) * 100)
            const remaining = bonus.threshold - bonus.streak
            return (
              <div key={key} style={{
                background: colors.surface, borderRadius: 10, padding: '10px 12px',
                border: `1px solid ${bonus.earned > 0 ? color + '44' : colors.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: bonus.earned > 0 ? color : colors.textDim }}>{label}</span>
                  {bonus.earned > 0 && (
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#fff',
                      background: color, borderRadius: 6, padding: '1px 6px',
                    }}>
                      {bonus.earned}
                    </span>
                  )}
                </div>
                <div style={{ height: 4, background: colors.surfaceHover, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{
                    height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 2,
                    background: bonus.earned > 0 ? color : `${color}88`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <div style={{ fontSize: 11, color: colors.textFaint }}>
                  {bonus.earned > 0
                    ? `${bonus.streak}/${bonus.threshold} to next`
                    : remaining > 0
                      ? `${remaining} day${remaining === 1 ? '' : 's'} to go`
                      : 'Available!'
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reset */}
      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <button onClick={() => {
          if (confirm('Reset all data? This cannot be undone.')) {
            clearAll()
          }
        }} style={{ background: 'none', border: 'none', color: colors.textInvisible, fontSize: 12, cursor: 'pointer', fontFamily: fonts.body }}>
          Reset All Data
        </button>
      </div>
    </div>
  )
}
