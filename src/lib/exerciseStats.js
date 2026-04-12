const getDuration = (entry, habitId) => {
  const val = entry?.[habitId]
  if (!val || typeof val !== 'object') return 0
  return val.duration_minutes || 0
}

export const getWeeklyExerciseMinutes = (data, allDates, dayIndex) => {
  const weeks = []
  const totalWeeks = Math.ceil(allDates.length / 7)

  for (let w = 0; w < totalWeeks; w++) {
    const weekDates = allDates.slice(w * 7, (w + 1) * 7)
    const isFuture = allDates.indexOf(weekDates[0]) > dayIndex
    if (isFuture) break

    let exercise = 0
    let mobilize = 0
    let hasData = false

    for (const d of weekDates) {
      if (allDates.indexOf(d) > dayIndex) break
      if (data[d]) {
        hasData = true
        exercise += getDuration(data[d], 'exercise')
        mobilize += getDuration(data[d], 'mobilize')
      }
    }

    if (hasData) {
      weeks.push({ week: `W${w + 1}`, exercise, mobilize, total: exercise + mobilize })
    }
  }

  return weeks
}

export const getActivityTypeBreakdown = (data, allDates, dayIndex) => {
  const typeMap = {}

  for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
    const d = allDates[i]
    const ex = data[d]?.exercise
    if (ex && typeof ex === 'object' && ex.type && ex.duration_minutes) {
      typeMap[ex.type] = (typeMap[ex.type] || 0) + ex.duration_minutes
    }
  }

  return Object.entries(typeMap)
    .map(([type, minutes]) => ({ type, minutes }))
    .sort((a, b) => b.minutes - a.minutes)
}

export const getDailyDurationTrend = (data, allDates, dayIndex) => {
  const result = []

  for (let i = 0; i <= dayIndex && i < allDates.length; i++) {
    const d = allDates[i]
    result.push({
      day: i + 1,
      date: d,
      exercise: getDuration(data[d], 'exercise'),
      mobilize: getDuration(data[d], 'mobilize'),
    })
  }

  return result
}
