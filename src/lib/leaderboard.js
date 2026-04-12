import { scoreDay, calculateStreak } from './scoring'
import { supabase } from './supabase'

/**
 * Subscribe to live changes on the profiles table. Calls `onChange` whenever
 * a row is inserted, updated, or deleted (so the caller can refetch the
 * leaderboard view). Returns an unsubscribe function.
 */
export const subscribeLeaderboard = (onChange) => {
  if (!supabase) return () => {}
  try {
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => onChange?.(payload)
      )
      .subscribe()
    return () => {
      try { supabase.removeChannel(channel) } catch { /* ignore */ }
    }
  } catch {
    return () => {}
  }
}

/**
 * Fetch the public leaderboard view (opted-in users only).
 * Returns rows with a 1-based `rank` added.
 */
export const fetchLeaderboard = async () => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('total_score', { ascending: false })

  if (error || !data) return []

  return data.map((entry, i) => ({ ...entry, rank: i + 1 }))
}

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
