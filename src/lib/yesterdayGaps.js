const isHabitCompleted = (value) => {
  if (value === true) return true
  if (value === false || value == null) return false
  if (typeof value === 'object') return !!value.completed
  return false
}

// Maps habits to the bonus key that covers them when missed
export const BONUS_COVERS = {
  exercise: 'restDay',
  sleep: 'nightOwl',
}

const HABIT_IDS = ['exercise', 'mobilize', 'sleep', 'hydrate', 'wellbeing', 'reflect']

/**
 * Returns the habit ids (and 'nutrition') that were incomplete yesterday
 * and not covered by a bonus. Returns [] if out of challenge range or no data.
 */
export const getYesterdayGaps = (data, yesterday, yesterdayDayIndex) => {
  if (yesterdayDayIndex < 0) return []
  const day = data?.[yesterday]
  if (!day) return []

  const applied = day.bonusApplied || {}
  if (applied.freeDay) return []

  const gaps = []

  for (const id of HABIT_IDS) {
    const bonusKey = BONUS_COVERS[id]
    if (bonusKey && applied[bonusKey]) continue
    if (!isHabitCompleted(day[id])) gaps.push(id)
  }

  if (!applied.indulgence && (day.nutrition ?? 5) < 5) {
    gaps.push('nutrition')
  }

  return gaps
}
