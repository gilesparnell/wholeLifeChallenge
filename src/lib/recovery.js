import { getExerciseEntries } from './habits'

const INTENSITY_MAP = {
  'HIIT': 1.0,
  'CrossFit': 0.95,
  'Running': 0.8,
  'Swimming': 0.75,
  'Cycling': 0.7,
  'Weights': 0.7,
  'Boxing': 0.85,
  'Rowing': 0.75,
  'Dancing': 0.6,
  'Walking': 0.4,
  'Yoga': 0.3,
  'Pilates': 0.35,
  'Stretching': 0.2,
  'Foam Rolling': 0.15,
  'Massage': 0.1,
}

const DEFAULT_INTENSITY = 0.5

const REQUIRED_FIELDS = ['sleepQuality', 'sleepHours', 'energyLevel', 'soreness', 'stressLevel', 'mood']

/**
 * Recovery Score (0-100) based on self-reported metrics.
 *
 * Formula weights:
 *   sleepQuality:  25%
 *   sleepHours:    20% (clamped 5-9)
 *   energyLevel:   20%
 *   soreness:      15% (inverted — low soreness = high recovery)
 *   stressLevel:   10% (inverted — low stress = high recovery)
 *   mood:          10%
 */
export const calculateRecoveryScore = (selfReport) => {
  if (!selfReport || typeof selfReport !== 'object') return null

  const hasAllFields = REQUIRED_FIELDS.every((f) => selfReport[f] != null)
  if (!hasAllFields) return null

  const { sleepQuality, sleepHours, energyLevel, soreness, stressLevel, mood } = selfReport

  const clampedHours = Math.min(9, Math.max(5, sleepHours))

  // Soreness/stress: 1=best(1.0), 5=worst(0.0). Map via (5 - value) / 4.
  const score = (
    (sleepQuality / 5) * 0.25 +
    ((clampedHours - 5) / 4) * 0.20 +
    (energyLevel / 5) * 0.20 +
    ((5 - soreness) / 4) * 0.15 +
    ((5 - stressLevel) / 4) * 0.10 +
    (mood / 5) * 0.10
  ) * 100

  return Math.round(Math.max(0, Math.min(100, score)))
}

/**
 * Strain Score (0-21, inspired by WHOOP's scale).
 * Based on exercise duration * intensity multiplier.
 */
export const calculateStrainScore = (exercise, mobilize) => {
  const getStrain = (activity) => {
    if (!activity || !activity.completed) return 0
    const entries = getExerciseEntries(activity)
    let strain = 0
    for (const entry of entries) {
      if (!entry.duration_minutes) continue
      const intensity = INTENSITY_MAP[entry.type] ?? DEFAULT_INTENSITY
      strain += (entry.duration_minutes / 60) * intensity * 3.5
    }
    return strain
  }

  const total = getStrain(exercise) + getStrain(mobilize)
  return Math.round(Math.min(21, total) * 10) / 10
}

/**
 * Recovery trend: array of { day, date, recovery, strain } for charting.
 */
export const getRecoveryTrend = (data, allDates, dayIndex) => {
  const result = []

  for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
    const d = allDates[i]
    const day = data[d] || {}

    result.push({
      day: i + 1,
      date: d,
      recovery: calculateRecoveryScore(day.selfReport),
      strain: calculateStrainScore(day.exercise, day.mobilize),
    })
  }

  return result
}
