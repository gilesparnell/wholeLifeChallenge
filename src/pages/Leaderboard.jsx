import { useState, useEffect, useCallback } from 'react'
import { fetchLeaderboard, subscribeLeaderboard } from '../lib/leaderboard'
import { setLeaderboardVisibility } from '../lib/profiles'
import { useAuth } from '../contexts/AuthContext'
import { colors, fonts } from '../styles/theme'

export default function Leaderboard() {
  const { profile, user } = useAuth()
  const [board, setBoard] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingVisibility, setSavingVisibility] = useState(false)
  const [localVisible, setLocalVisible] = useState(false)

  const refresh = useCallback(async () => {
    const result = await fetchLeaderboard()
    setBoard(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    setLocalVisible(!!profile?.leaderboard_visible)
  }, [refresh, profile?.leaderboard_visible])

  // Live updates: refetch whenever any profile row changes
  useEffect(() => {
    const unsubscribe = subscribeLeaderboard(() => { refresh() })
    return unsubscribe
  }, [refresh])

  const toggleVisibility = async () => {
    if (!profile?.id || savingVisibility) return
    setSavingVisibility(true)
    const next = !localVisible
    setLocalVisible(next)
    await setLeaderboardVisibility(profile.id, next)
    await refresh()
    setSavingVisibility(false)
  }

  const medals = ['', '\u{1F947}', '\u{1F948}', '\u{1F949}']
  const myId = profile?.id

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: colors.textDim }}>Loading...</div>
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 300, marginBottom: 8, textAlign: 'center' }}>
        Leaderboard
      </h2>
      <p style={{ fontSize: 12, color: colors.textDim, textAlign: 'center', marginBottom: 16 }}>
        {board.length === 0 ? 'No one has opted in yet' : `${board.length} challenger${board.length === 1 ? '' : 's'}`}
      </p>

      {/* Opt-in toggle */}
      {profile && (
        <div style={{
          background: colors.surface, borderRadius: 14, padding: '14px 16px', marginBottom: 16,
          border: `1px solid ${localVisible ? colors.accent + '44' : colors.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
              {localVisible ? 'You\u2019re on the leaderboard' : 'Join the leaderboard'}
            </div>
            <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }}>
              {localVisible
                ? 'Your display name and total score are visible to other challengers.'
                : 'Opt in to compare your progress with others. Reflections stay private.'}
            </div>
          </div>
          <button
            onClick={toggleVisibility}
            disabled={savingVisibility}
            style={{
              background: localVisible ? colors.accent : 'transparent',
              border: `1px solid ${localVisible ? colors.accent : colors.borderSubtle}`,
              borderRadius: 999, padding: '6px 14px',
              color: localVisible ? '#fff' : colors.textDim,
              fontSize: 12, fontWeight: 700, cursor: savingVisibility ? 'wait' : 'pointer',
              fontFamily: fonts.body, marginLeft: 12, flexShrink: 0,
            }}
          >
            {localVisible ? 'On' : 'Off'}
          </button>
        </div>
      )}

      {board.length === 0 ? (
        <p style={{ textAlign: 'center', color: colors.textGhost, fontSize: 13, marginTop: 40 }}>
          {localVisible
            ? 'You\u2019re the first! Once others join, you\u2019ll see them here.'
            : 'Toggle the switch above to join.'}
        </p>
      ) : (
        board.map((entry) => {
          const isMe = entry.id === myId
          return (
            <div
              key={entry.id}
              style={{
                background: isMe ? colors.surfaceHover : colors.surface,
                borderRadius: 14, padding: '14px 16px', marginBottom: 8,
                border: `1px solid ${entry.rank === 1 ? colors.accent + '44' : isMe ? colors.accent + '33' : colors.border}`,
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: colors.text }}>{entry.display_name || 'Anonymous'}</span>
                    {isMe && (
                      <span style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 4,
                        background: colors.accent + '22', color: colors.accent,
                        fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
                      }}>
                        You
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textFaint }}>
                    {entry.days_active} days · {entry.current_streak} day streak
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontFamily: fonts.display, fontWeight: 700, color: colors.accent }}>
                  {entry.total_score}
                </div>
                <div style={{ fontSize: 12, color: colors.textGhost }}>pts</div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
