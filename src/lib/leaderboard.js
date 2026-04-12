import { scoreDay, calculateStreak } from './scoring'

export const computeLeaderboard = (usersData, allDates, dayIndex) => {
  if (!usersData.length) return []

  const board = usersData.map((user) => {
    const totalScore = Object.values(user.data || {}).reduce(
      (sum, day) => sum + scoreDay(day),
      0
    )
    const streak = calculateStreak(user.data || {}, allDates, dayIndex)
    const daysActive = Object.keys(user.data || {}).length

    return {
      display_name: user.display_name,
      totalScore,
      streak,
      daysActive,
    }
  })

  board.sort((a, b) => b.totalScore - a.totalScore)
  board.forEach((entry, i) => { entry.rank = i + 1 })

  return board
}
