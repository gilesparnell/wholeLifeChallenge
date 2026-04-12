const HABITS = ['exercise', 'mobilize', 'sleep', 'hydrate', 'wellbeing', 'reflect']

const isHabitCompleted = (value) => {
  if (value === true) return true  // legacy boolean format
  if (value === false || value == null) return false
  if (typeof value === 'object') return !!value.completed
  return false
}

export const scoreDay = (day) => {
  if (!day) return 0
  let score = Math.max(0, day.nutrition || 0)
  HABITS.forEach((id) => {
    if (isHabitCompleted(day[id])) score += 5
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
    if (d && isHabitCompleted(data[d]?.[habitId])) streak++
    else break
  }
  return streak
}
