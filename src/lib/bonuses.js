import { scoreDay } from './scoring'

const isHabitCompleted = (value) => {
  if (value === true) return true
  if (value === false || value == null) return false
  if (typeof value === 'object') return !!value.completed
  return false
}

const emptyBonus = (threshold) => ({ earned: 0, streak: 0, threshold })

/**
 * Compute all 4 WLC bonus types from daily data.
 *
 * Indulgence: 18+/20 nutrition points over 4 consecutive days
 * Rest Day: 10 consecutive days of completed exercise
 * Night Owl: 6 consecutive days of completed sleep
 * Free Day: 21 consecutive days with score >= 34 (near-perfect, 730/735 over 21 days avg)
 */
export const computeBonuses = (data, allDates, dayIndex) => {
  const indulgence = emptyBonus(4)
  const restDay = emptyBonus(10)
  const nightOwl = emptyBonus(6)
  const freeDay = emptyBonus(21)

  // Rolling window for indulgence (4-day nutrition total)
  let nutritionWindow = []

  // Consecutive streaks for rest day, night owl, free day
  let exerciseStreak = 0
  let sleepStreak = 0
  let freeDayStreak = 0

  for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
    const d = allDates[i]
    const day = data[d] || {}

    // --- Indulgence: sliding window of 4 days ---
    const nutrition = Math.max(0, day.nutrition || 0)
    nutritionWindow.push(nutrition)
    if (nutritionWindow.length > 4) nutritionWindow.shift()

    if (nutritionWindow.length === 4) {
      const total = nutritionWindow.reduce((s, n) => s + n, 0)
      if (total >= 18) {
        indulgence.earned++
        nutritionWindow = [] // reset window after earning
      }
    }

    // --- Rest Day: consecutive exercise completions ---
    if (isHabitCompleted(day.exercise)) {
      exerciseStreak++
      if (exerciseStreak >= 10) {
        restDay.earned++
        exerciseStreak = 0
      }
    } else {
      exerciseStreak = 0
    }

    // --- Night Owl: consecutive sleep completions ---
    if (isHabitCompleted(day.sleep)) {
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

  // Set current streaks (progress toward next bonus)
  indulgence.streak = nutritionWindow.length
  restDay.streak = exerciseStreak
  nightOwl.streak = sleepStreak
  freeDay.streak = freeDayStreak

  return { indulgence, restDay, nightOwl, freeDay }
}
