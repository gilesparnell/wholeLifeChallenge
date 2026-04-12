const HABITS = ['exercise', 'mobilize', 'sleep', 'hydrate', 'wellbeing', 'reflect']

// Maps each habit to the bonus that can cover it when missed
const BONUS_FOR_HABIT = {
  exercise: 'restDay',
  sleep: 'nightOwl',
}

const isHabitCompleted = (value) => {
  if (value === true) return true  // legacy boolean format
  if (value === false || value == null) return false
  if (typeof value === 'object') return !!value.completed
  return false
}

export const scoreDay = (day) => {
  if (!day) return 0

  const applied = day.bonusApplied || {}
  if (applied.freeDay) return 35

  // Nutrition: indulgence bonus overrides to 5
  let score = applied.indulgence ? 5 : Math.max(0, day.nutrition || 0)

  HABITS.forEach((id) => {
    const covered = BONUS_FOR_HABIT[id] && applied[BONUS_FOR_HABIT[id]]
    if (isHabitCompleted(day[id]) || covered) score += 5
  })
  return score
}

export const calculateStreak = (data, allDates, dayIndex) => {
  let streak = 0
  for (let i = dayIndex; i >= 0; i--) {
    const d = allDates[i]
    if (d && scoreDay(data[d]) === 35) streak++
    else break
  }
  return streak
}

export const calculateHabitStreak = (data, allDates, dayIndex, habitId) => {
  let streak = 0
  for (let i = dayIndex; i >= 0; i--) {
    const d = allDates[i]
    const day = data[d]
    if (!d || !day) break
    const applied = day.bonusApplied || {}
    const bonusCovered = (applied.freeDay) ||
      (BONUS_FOR_HABIT[habitId] && applied[BONUS_FOR_HABIT[habitId]])
    if (isHabitCompleted(day[habitId]) || bonusCovered) streak++
    else break
  }
  return streak
}
