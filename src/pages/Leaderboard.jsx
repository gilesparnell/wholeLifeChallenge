import { useState, useEffect } from 'react'
import { computeLeaderboard } from '../lib/leaderboard'
import { getAllDates, getDayIndex, getToday } from '../lib/dates'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { colors, fonts } from '../styles/theme'

export default function Leaderboard() {
  const { user } = useAuth()
  const { data: myData, loading: dataLoading } = useData()
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (dataLoading) return
    const allDates = getAllDates()
    const dayIndex = getDayIndex(getToday())
    const myName = user?.user_metadata?.full_name || user?.email || 'You'

    // TODO: When multi-user, fetch all users' data from Supabase
    const usersData = [{ display_name: myName, data: myData }]
    setBoard(computeLeaderboard(usersData, allDates, dayIndex))
    setLoading(false)
  }, [user, myData, dataLoading])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: colors.textDim }}>Loading...</div>
  }

  const medals = ['', '\u{1F947}', '\u{1F948}', '\u{1F949}']

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 300, marginBottom: 8, textAlign: 'center' }}>
        Leaderboard
      </h2>
      <p style={{ fontSize: 12, color: colors.textDim, textAlign: 'center', marginBottom: 24 }}>
        {board.length === 1 ? 'Your stats — more players appear when auth is enabled' : `${board.length} challengers`}
      </p>

      {board.map((entry) => (
        <div
          key={entry.display_name}
          style={{
            background: colors.surface, borderRadius: 14, padding: '14px 16px', marginBottom: 8,
            border: `1px solid ${entry.rank === 1 ? colors.accent + '44' : colors.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: entry.rank <= 3 ? colors.accent : colors.surfaceHover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: entry.rank <= 3 ? 18 : 14, fontWeight: 700,
              color: entry.rank <= 3 ? '#fff' : colors.textMuted,
            }}>
              {medals[entry.rank] || entry.rank}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>{entry.display_name}</div>
              <div style={{ fontSize: 12, color: colors.textFaint }}>
                {entry.daysActive} days active · {entry.streak} day streak
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontFamily: fonts.display, fontWeight: 700, color: colors.accent }}>
              {entry.totalScore}
            </div>
            <div style={{ fontSize: 12, color: colors.textGhost }}>pts</div>
          </div>
        </div>
      ))}

      {board.length === 0 && (
        <p style={{ textAlign: 'center', color: colors.textGhost, fontSize: 13, marginTop: 40 }}>
          No data yet. Start checking in!
        </p>
      )}
    </div>
  )
}
