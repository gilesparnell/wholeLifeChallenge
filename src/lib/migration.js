const DEFAULT_HYDRATION_TARGET = 2000

const migrateHabit = (value, habitId, dayData, hydrationTarget) => {
  // Already in new object format
  if (value != null && typeof value === 'object') return value

  switch (habitId) {
    case 'exercise':
    case 'mobilize':
      return { completed: !!value, type: value ? 'Other' : '' }

    case 'sleep':
      return { completed: !!value, hours: null }

    case 'hydrate':
      return {
        completed: !!value,
        current_ml: value ? (hydrationTarget || DEFAULT_HYDRATION_TARGET) : 0,
        target_ml: hydrationTarget || DEFAULT_HYDRATION_TARGET,
      }

    case 'wellbeing':
      return { completed: !!value, activity_text: '' }

    case 'reflect':
      return {
        completed: !!value,
        reflection_text: dayData?.reflection || '',
      }

    default:
      return value
  }
}

export const migrateLegacyDay = (day, hydrationTarget) => {
  if (day == null) return null

  const result = { ...day }
  const habits = ['exercise', 'mobilize', 'sleep', 'hydrate', 'wellbeing', 'reflect']

  habits.forEach((id) => {
    result[id] = migrateHabit(day[id], id, day, hydrationTarget)
  })

  // Remove legacy reflexion field (now stored inside reflect object)
  delete result.reflection

  return result
}

export const migrateLegacyData = (data, hydrationTarget) => {
  const result = {}
  Object.entries(data).forEach(([date, day]) => {
    const migrated = migrateLegacyDay(day, hydrationTarget)
    if (migrated) result[date] = migrated
  })
  return result
}
