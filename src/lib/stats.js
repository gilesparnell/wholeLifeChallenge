import { scoreDay } from './scoring'

/**
 * Sum of scores for days from start of challenge up to and including
 * the current day (inclusive of dayIndex). Excludes data for future days
 * so sample/test data doesn't pollute the total.
 */
export const calculateTotalScore = (data, allDates, dayIndex) => {
  if (dayIndex < 0) return 0

  let total = 0
  const endIdx = Math.min(dayIndex, allDates.length - 1)
  for (let i = 0; i <= endIdx; i++) {
    total += scoreDay(data[allDates[i]])
  }
  return total
}

/**
 * Maximum possible score based on days elapsed.
 * Each day is worth 35 points max. Capped at challengeDays.
 */
export const calculateMaxPossible = (dayIndex, challengeDays) => {
  if (dayIndex < 0) return 0
  const daysElapsed = Math.min(dayIndex + 1, challengeDays)
  return daysElapsed * 35
}

/**
 * Percentage of maximum score achieved. Returns 0-100 as an integer.
 */
export const calculateRate = (totalScore, maxPossible) => {
  if (maxPossible <= 0) return 0
  const rate = (totalScore / maxPossible) * 100
  return Math.round(Math.min(100, Math.max(0, rate)))
}

/**
 * Truncate a text snippet for inline preview. Takes the first line, trims
 * whitespace, and caps at `limit` characters (default 40) with a trailing
 * ellipsis if it overflows.
 */
export const truncatePreview = (text, limit = 40) => {
  if (!text) return ''
  const firstLine = text.split('\n')[0].trim()
  if (firstLine.length <= limit) return firstLine
  return firstLine.slice(0, limit).trimEnd() + '\u2026'
}
