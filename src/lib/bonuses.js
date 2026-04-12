import { scoreDay } from './scoring'

/**
 * Static metadata for each WLC bonus type — label, icon, threshold, and
 * an explanation of what the bonus is and how it's earned, sourced from
 * the Whole Life Challenge official rules.
 *
 * Rendered in the Bonus Tracker on the CheckIn page.
 */
export const BONUS_INFO = {
  indulgence: {
    label: 'Indulgence',
    icon: '\u{1F37D}\uFE0F',
    colorKey: 'green',
    threshold: 4,
    description:
      'Earn 1 indulgence bonus for every 4 consecutive days where you score 18+ out of 20 nutrition points. Use it to erase a non-compliant food deduction — a free pass when you slip up on nutrition.',
  },
  restDay: {
    label: 'Rest Day',
    icon: '\u{1F6CC}',
    colorKey: 'blue',
    threshold: 10,
    description:
      'Earn 1 rest day bonus for every 10 consecutive days of completed exercise. Use it to skip exercise on a recovery day without losing points — your body needs rest.',
  },
  nightOwl: {
    label: 'Night Owl',
    icon: '\u{1F989}',
    colorKey: 'purple',
    threshold: 6,
    description:
      'Earn 1 night owl bonus for every 6 consecutive days of meeting your sleep goal. Use it to skip a night of sleep tracking without losing points — perfect for travel or late nights.',
  },
  freeDay: {
    label: 'Free Day',
    icon: '\u{1F31F}',
    colorKey: 'orange',
    threshold: 21,
    description:
      'Earn 1 free day for every 21 consecutive near-perfect days (34+ out of 35 points). Activate it to instantly score a perfect 35/35 on any day — the ultimate reward for consistency.',
  },
}

const isHabitCompleted = (value) => {
  if (value === true) return true
  if (value === false || value == null) return false
  if (typeof value === 'object') return !!value.completed
  return false
}

const emptyBonus = (threshold) => ({
  earned: 0, used: 0, available: 0,
  streak: 0, threshold,
})

/**
 * Compute all 4 WLC bonus types from daily data.
 *
 * Indulgence: 18+/20 nutrition points over 4 consecutive days
 * Rest Day: 10 consecutive days of completed exercise
 * Night Owl: 6 consecutive days of completed sleep
 * Free Day: 21 consecutive days with score >= 34 (near-perfect)
 *
 * `used` counts days with `bonusApplied[type] === true`.
 * `available` = `earned - used`.
 */
export const computeBonuses = (data, allDates, dayIndex) => {
  const indulgence = emptyBonus(4)
  const restDay = emptyBonus(10)
  const nightOwl = emptyBonus(6)
  const freeDay = emptyBonus(21)

  let nutritionWindow = []
  let exerciseStreak = 0
  let sleepStreak = 0
  let freeDayStreak = 0

  for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
    const d = allDates[i]
    const day = data[d] || {}
    const applied = day.bonusApplied || {}

    // Count bonus usage from persisted day data
    if (applied.indulgence) indulgence.used++
    if (applied.restDay) restDay.used++
    if (applied.nightOwl) nightOwl.used++
    if (applied.freeDay) freeDay.used++

    // --- Indulgence: sliding window of 4 days ---
    // Treat applied indulgence as 5 nutrition for earning purposes too
    const nutritionForWindow = applied.indulgence ? 5 : Math.max(0, day.nutrition || 0)
    nutritionWindow.push(nutritionForWindow)
    if (nutritionWindow.length > 4) nutritionWindow.shift()

    if (nutritionWindow.length === 4) {
      const total = nutritionWindow.reduce((s, n) => s + n, 0)
      if (total >= 18) {
        indulgence.earned++
        nutritionWindow = []
      }
    }

    // --- Rest Day: consecutive exercise completions ---
    // Bonus application counts as completed for earning purposes
    if (isHabitCompleted(day.exercise) || applied.restDay || applied.freeDay) {
      exerciseStreak++
      if (exerciseStreak >= 10) {
        restDay.earned++
        exerciseStreak = 0
      }
    } else {
      exerciseStreak = 0
    }

    // --- Night Owl: consecutive sleep completions ---
    if (isHabitCompleted(day.sleep) || applied.nightOwl || applied.freeDay) {
      sleepStreak++
      if (sleepStreak >= 6) {
        nightOwl.earned++
        sleepStreak = 0
      }
    } else {
      sleepStreak = 0
    }

    // --- Free Day: consecutive near-perfect days (score >= 34) ---
    const dayScore = scoreDay(day)
    if (dayScore >= 34) {
      freeDayStreak++
      if (freeDayStreak >= 21) {
        freeDay.earned++
        freeDayStreak = 0
      }
    } else {
      freeDayStreak = 0
    }
  }

  indulgence.streak = nutritionWindow.length
  restDay.streak = exerciseStreak
  nightOwl.streak = sleepStreak
  freeDay.streak = freeDayStreak

  indulgence.available = Math.max(0, indulgence.earned - indulgence.used)
  restDay.available = Math.max(0, restDay.earned - restDay.used)
  nightOwl.available = Math.max(0, nightOwl.earned - nightOwl.used)
  freeDay.available = Math.max(0, freeDay.earned - freeDay.used)

  return { indulgence, restDay, nightOwl, freeDay }
}

/**
 * Auto-apply available bonuses to cover missed habits on a day.
 * Returns a new day object with `bonusApplied` flags set.
 * Does not override bonuses already applied on the day.
 */
export const applyAutoBonuses = (day, bonuses) => {
  const existing = day.bonusApplied || {}
  const next = { ...existing }

  // Indulgence covers missed nutrition (nutrition < 5)
  if (!existing.indulgence && (day.nutrition ?? 5) < 5 && bonuses.indulgence.available > 0) {
    next.indulgence = true
  }

  // Rest Day covers missed exercise
  if (!existing.restDay && !isHabitCompleted(day.exercise) && bonuses.restDay.available > 0) {
    next.restDay = true
  }

  // Night Owl covers missed sleep
  if (!existing.nightOwl && !isHabitCompleted(day.sleep) && bonuses.nightOwl.available > 0) {
    next.nightOwl = true
  }

  return { ...day, bonusApplied: next }
}
