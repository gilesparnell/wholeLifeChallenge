import { scoreDay, calculateStreak } from './scoring'
import { calculateTotalScore, calculateMaxPossible, calculateRate, countDaysLogged } from './stats'
import { HABITS } from './habits'

const isCompleted = (value) => {
  if (value === true) return true
  if (value === false || value == null) return false
  if (typeof value === 'object') return !!value.completed
  return false
}

export const buildQueryContext = (data, allDates, dayIndex, challengeDays) => {
  const daysElapsed = Math.min(Math.max(dayIndex + 1, 1), challengeDays)
  const daysLogged = countDaysLogged(data, dayIndex)
  const totalScore = calculateTotalScore(data, allDates, dayIndex)
  const maxPossible = calculateMaxPossible(dayIndex, challengeDays)
  const rate = calculateRate(totalScore, maxPossible)
  const streak = calculateStreak(data, allDates, dayIndex)
  const todayScore = scoreDay(data[allDates[dayIndex]])

  // Habit stats across days that have a check-in logged
  const loggedDates = allDates.slice(0, dayIndex + 1).filter((d) => data[d])

  const nutritionAvg = loggedDates.length > 0
    ? (loggedDates.reduce((sum, d) => sum + (data[d]?.nutrition || 0), 0) / loggedDates.length).toFixed(1)
    : '0.0'

  const habitLines = HABITS.map((h) => {
    const completed = loggedDates.filter((d) => isCompleted(data[d]?.[h.id])).length
    const pct = loggedDates.length > 0 ? Math.round((completed / loggedDates.length) * 100) : 0
    return `  ${h.label}: ${completed}/${loggedDates.length} days (${pct}%)`
  })

  return [
    `Whole Life Challenge — Day ${daysElapsed} of ${challengeDays}`,
    `Days elapsed: ${daysElapsed} | Days logged: ${daysLogged} | Days missed: ${daysElapsed - daysLogged}`,
    '',
    `Score: ${totalScore}/${maxPossible} pts (${rate}% of max possible)`,
    `Today's score: ${todayScore}/35`,
    `Streak: ${streak} consecutive perfect (35/35) days`,
    '',
    `Habit breakdown (${loggedDates.length} check-ins logged):`,
    `  Nutrition: avg ${nutritionAvg}/5 per day`,
    ...habitLines,
  ].join('\n')
}
