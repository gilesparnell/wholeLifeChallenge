import { scoreDay, calculateHabitStreak } from './scoring'
import { getTotalExerciseMinutes } from './habits'

const isHabitCompleted = (value) => {
  if (value === true) return true
  if (value === false || value == null) return false
  if (typeof value === 'object') return !!value.completed
  return false
}

const isDayLogged = (day) => {
  if (!day) return false
  if (day.nutrition != null && day.nutrition > 0) return true
  const habits = ['exercise', 'mobilize', 'sleep', 'hydrate', 'wellbeing', 'reflect']
  return habits.some((h) => isHabitCompleted(day[h]))
}

/**
 * Pearson product-moment correlation. Returns null for insufficient
 * data, 0 for a constant series (avoids divide-by-zero).
 */
export const pearson = (xs, ys) => {
  if (!Array.isArray(xs) || !Array.isArray(ys)) return null
  if (xs.length !== ys.length) return null
  if (xs.length < 2) return null
  const n = xs.length
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
  for (let i = 0; i < n; i++) {
    sumX += xs[i]
    sumY += ys[i]
    sumXY += xs[i] * ys[i]
    sumX2 += xs[i] * xs[i]
    sumY2 += ys[i] * ys[i]
  }
  const denomX = n * sumX2 - sumX * sumX
  const denomY = n * sumY2 - sumY * sumY
  if (denomX === 0 || denomY === 0) return 0
  const r = (n * sumXY - sumX * sumY) / Math.sqrt(denomX * denomY)
  return r
}

const HABIT_KEYS = ['nutrition', 'exercise', 'mobilize', 'sleep', 'hydrate', 'wellbeing', 'reflect']
const NUTRITION_STREAK_THRESHOLD = 3

/**
 * Current streak length per habit, looking backwards from dayIndex.
 * Nutrition counts any day where the score is >= 3 (out of 5).
 */
export const calculateHabitStreaks = (data, allDates, dayIndex) => {
  const out = {}
  for (const habit of HABIT_KEYS) {
    if (habit === 'nutrition') {
      let streak = 0
      for (let i = dayIndex; i >= 0; i--) {
        const d = allDates[i]
        const day = data[d]
        if (!day || (day.nutrition ?? 0) < NUTRITION_STREAK_THRESHOLD) break
        streak++
      }
      out.nutrition = streak
    } else {
      out[habit] = calculateHabitStreak(data, allDates, dayIndex, habit)
    }
  }
  return out
}

/**
 * The single highest-scoring day and the single highest-scoring
 * seven-day block from day 0 up to dayIndex.
 */
export const calculatePersonalBest = (data, allDates, dayIndex) => {
  if (dayIndex < 0) return { bestDay: null, bestWeek: null }

  let bestDay = null
  let bestWeek = null
  const weekTotals = []

  for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
    const d = allDates[i]
    const score = scoreDay(data[d])
    if (!bestDay || score > bestDay.score) {
      bestDay = { dayNumber: i + 1, date: d, score }
    }
    const weekIdx = Math.floor(i / 7)
    weekTotals[weekIdx] = (weekTotals[weekIdx] || 0) + score
  }

  if (weekTotals.length > 0) {
    let bestIdx = 0
    weekTotals.forEach((total, idx) => {
      if (total > weekTotals[bestIdx]) bestIdx = idx
    })
    bestWeek = { weekNumber: bestIdx + 1, total: weekTotals[bestIdx] }
  }

  return { bestDay, bestWeek }
}

/**
 * Consistency = percentage of elapsed days that have any logged content.
 * Integer 0-100.
 */
export const calculateConsistency = (data, allDates, dayIndex) => {
  if (dayIndex < 0) return 0
  const elapsed = Math.min(dayIndex + 1, allDates.length)
  if (elapsed <= 0) return 0
  let logged = 0
  for (let i = 0; i < elapsed; i++) {
    if (isDayLogged(data[allDates[i]])) logged++
  }
  return Math.round((logged / elapsed) * 100)
}

/**
 * Extends the user's cumulative line to the challenge end date using
 * their average score per day so far. Never projects past challengeDays.
 */
export const projectCumulative = (data, allDates, dayIndex, challengeDays) => {
  if (dayIndex < 0) {
    return { currentTotal: 0, projectedTotal: 0, projectedSeries: [] }
  }

  let currentTotal = 0
  const loggedScores = []
  for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
    const s = scoreDay(data[allDates[i]])
    currentTotal += s
    loggedScores.push(s)
  }

  const avg = loggedScores.length > 0
    ? loggedScores.reduce((a, b) => a + b, 0) / loggedScores.length
    : 0
  const daysRemaining = Math.max(0, challengeDays - (dayIndex + 1))
  const projectedTotal = Math.round(currentTotal + avg * daysRemaining)

  // Series extends from the day AFTER the last logged day out to challengeDays.
  const projectedSeries = []
  let running = currentTotal
  const startDay = dayIndex + 2 // 1-indexed — next day after dayIndex
  for (let day = startDay; day <= challengeDays; day++) {
    running += avg
    projectedSeries.push({ day, projected: Math.round(running) })
  }

  return { currentTotal, projectedTotal, projectedSeries }
}

// Pairs of (numeric field extracted from a day) to test for correlation.
// Each extractor returns null if the field isn't present for that day.
const FIELD_EXTRACTORS = {
  nutrition: (day) => (day?.nutrition != null ? day.nutrition : null),
  score: (day) => scoreDay(day),
  sleepHours: (day) => day?.selfReport?.sleepHours ?? day?.sleep?.hours ?? null,
  sleepQuality: (day) => day?.selfReport?.sleepQuality ?? null,
  energyLevel: (day) => day?.selfReport?.energyLevel ?? null,
  stressLevel: (day) => day?.selfReport?.stressLevel ?? null,
  mood: (day) => day?.selfReport?.mood ?? null,
  hydrateMl: (day) => day?.hydrate?.current_ml ?? null,
  exerciseMinutes: (day) => {
    const total = getTotalExerciseMinutes(day?.exercise)
    return total > 0 ? total : null
  },
}

const CORRELATION_PAIRS = [
  ['sleepHours', 'nutrition'],
  ['sleepHours', 'score'],
  ['sleepQuality', 'score'],
  ['energyLevel', 'score'],
  ['stressLevel', 'score'], // expect negative
  ['mood', 'score'],
  ['exerciseMinutes', 'energyLevel'],
  ['hydrateMl', 'score'],
]

const CORRELATION_R_THRESHOLD = 0.3
const CORRELATION_MIN_N = 7

/**
 * Surface Pearson correlations between wellness metrics and performance
 * that pass both the |r| threshold (0.3) and the minimum sample size (7).
 * Returns a sorted array, strongest correlations first.
 */
export const calculateCorrelations = (data, allDates, dayIndex) => {
  if (dayIndex < CORRELATION_MIN_N - 1) return []

  const results = []
  for (const [xKey, yKey] of CORRELATION_PAIRS) {
    const xs = []
    const ys = []
    for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
      const day = data[allDates[i]]
      if (!day) continue
      const x = FIELD_EXTRACTORS[xKey](day)
      const y = FIELD_EXTRACTORS[yKey](day)
      if (x == null || y == null) continue
      xs.push(x)
      ys.push(y)
    }
    if (xs.length < CORRELATION_MIN_N) continue
    const r = pearson(xs, ys)
    if (r == null) continue
    if (Math.abs(r) < CORRELATION_R_THRESHOLD) continue
    results.push({ x: xKey, y: yKey, r, n: xs.length })
  }
  results.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  return results
}

/**
 * Per-day delta between the user's cumulative score and the mean of the
 * peer group's cumulative scores at the same day index. Peers with
 * shorter histories only contribute to days they reached.
 */
export const calculatePeerDelta = (userCumulative, peerCumulatives) => {
  if (!Array.isArray(userCumulative) || userCumulative.length === 0) return []
  const out = []
  for (let i = 0; i < userCumulative.length; i++) {
    const peersAtDay = (peerCumulatives || [])
      .map((p) => (Array.isArray(p) && i < p.length ? p[i] : null))
      .filter((v) => v != null)
    const peerAvg = peersAtDay.length > 0
      ? peersAtDay.reduce((a, b) => a + b, 0) / peersAtDay.length
      : 0
    out.push({
      day: i + 1,
      user: userCumulative[i],
      peerAvg,
      delta: userCumulative[i] - peerAvg,
    })
  }
  return out
}

const RADAR_AXES = [
  { axis: 'Nutrition', key: 'nutrition' },
  { axis: 'Exercise', key: 'exercise' },
  { axis: 'Mobilise', key: 'mobilize' },
  { axis: 'Sleep', key: 'sleep' },
  { axis: 'Hydrate', key: 'hydrate' },
  { axis: 'Wellbeing', key: 'wellbeing' },
]

/**
 * Six-axis radar values (0-100) for a specific seven-day window.
 * Nutrition is averaged out of 5 then scaled; habits are completion %.
 */
export const calculateRadarWeek = (data, allDates, weekIndex) => {
  const start = weekIndex * 7
  const end = start + 7
  const days = []
  for (let i = start; i < end && i < allDates.length; i++) {
    const day = data[allDates[i]]
    if (day) days.push(day)
  }
  if (days.length === 0) {
    return RADAR_AXES.map(({ axis }) => ({ axis, value: 0 }))
  }
  return RADAR_AXES.map(({ axis, key }) => {
    if (key === 'nutrition') {
      const avg = days.reduce((s, d) => s + (d.nutrition ?? 0), 0) / days.length
      return { axis, value: Math.round((avg / 5) * 100) }
    }
    const completions = days.filter((d) => isHabitCompleted(d[key])).length
    return { axis, value: Math.round((completions / days.length) * 100) }
  })
}

/**
 * One entry per day of the challenge. Logged days carry a real score;
 * unlogged past days are 0; days beyond dayIndex are marked future: true
 * so the renderer can grey them out.
 */
export const calculateHeatmapData = (data, allDates, dayIndex, challengeDays) => {
  const out = []
  for (let i = 0; i < challengeDays; i++) {
    const d = allDates[i]
    const day = d ? data[d] : null
    const score = day ? scoreDay(day) : 0
    out.push({
      day: i + 1,
      date: d || null,
      score,
      intensity: score / 35,
      future: i > dayIndex,
    })
  }
  return out
}

/**
 * Headline stats for the top of the Progress page.
 */
export const calculateStatCards = (data, allDates, dayIndex, challengeDays) => {
  const { bestDay, bestWeek } = calculatePersonalBest(data, allDates, dayIndex)
  const consistency = calculateConsistency(data, allDates, dayIndex)
  const streaks = calculateHabitStreaks(data, allDates, dayIndex)

  let totalScore = 0
  for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
    totalScore += scoreDay(data[allDates[i]])
  }

  let longestHabit = null
  let longestDays = 0
  for (const [habit, streak] of Object.entries(streaks)) {
    if (streak > longestDays) {
      longestHabit = habit
      longestDays = streak
    }
  }

  return {
    totalScore,
    consistency,
    bestDay,
    bestWeek,
    longestHabitStreak: { habit: longestHabit, days: longestDays },
    maxPossible: Math.max(0, Math.min(dayIndex + 1, challengeDays)) * 35,
  }
}

const WELLNESS_FIELDS = ['mood', 'energyLevel', 'stressLevel', 'soreness', 'sleepHours']

/**
 * One time series per self-reported wellness field. Days with no
 * selfReport are skipped rather than charted as zero.
 */
export const calculateWellnessTrends = (data, allDates, dayIndex) => {
  const out = {}
  for (const field of WELLNESS_FIELDS) out[field] = []

  for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
    const d = allDates[i]
    const day = data[d]
    if (!day || !day.selfReport) continue
    for (const field of WELLNESS_FIELDS) {
      const v = day.selfReport[field]
      if (v == null) continue
      out[field].push({ day: i + 1, date: d, value: v })
    }
  }
  return out
}
