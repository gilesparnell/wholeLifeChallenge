import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LineChart, Line, ComposedChart } from 'recharts'
import { HABITS } from '../lib/habits'
import { scoreDay } from '../lib/scoring'
import { getDayIndex, getToday, getAllDates, CHALLENGE_DAYS } from '../lib/dates'
import { getWeeklyExerciseMinutes, getActivityTypeBreakdown, getDailyDurationTrend } from '../lib/exerciseStats'
import { getRecoveryTrend } from '../lib/recovery'
import { fetchLeaderboard, subscribeLeaderboard } from '../lib/leaderboard'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { colors, fonts } from '../styles/theme'

// Palette for overlay user lines on the cumulative chart.
const OVERLAY_COLORS = [
  '#6B5CE7', // purple
  '#2E9E5A', // green
  '#C87F2A', // orange
  '#D14A7A', // pink
  '#2E8BC0', // blue
  '#7BAE38', // lime
  '#A0522D', // sienna
  '#5F4B8B', // indigo
]

export default function Progress() {
  const { data, loading } = useData()
  const { profile } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])

  // Fetch leaderboard on mount + subscribe to live updates so the comparison
  // overlay reflects what other users are doing.
  useEffect(() => {
    let alive = true
    const refresh = async () => {
      const result = await fetchLeaderboard()
      if (alive) setLeaderboard(result)
    }
    refresh()
    const unsubscribe = subscribeLeaderboard(refresh)
    return () => { alive = false; unsubscribe() }
  }, [])

  const today = getToday()
  const dayIndex = getDayIndex(today)
  const allDates = getAllDates()

  // Show all dates that have data OR are up to today, whichever is more
  const lastDataIndex = allDates.reduce((max, d, i) => (data[d] ? i : max), -1)
  const visibleEnd = Math.max(dayIndex + 1, lastDataIndex + 1)
  const visibleDates = allDates.slice(0, Math.min(visibleEnd, CHALLENGE_DAYS))

  // Daily score chart data
  const chartData = visibleDates.map((d, i) => ({
    day: i + 1,
    score: scoreDay(data[d]),
    date: d,
  }))

  // Cumulative score chart data — merged with each opted-in user's
  // cumulative_by_day for the comparison overlay.
  // Only show comparison overlays for users OTHER than yourself, since
  // your own line is already on the chart as `total`.
  const otherUsers = leaderboard.filter((u) => u.id !== profile?.id)
  let cumulative = 0
  const cumulativeData = visibleDates.map((d, i) => {
    cumulative += scoreDay(data[d])
    const row = { day: i + 1, total: cumulative, perfectPace: (i + 1) * 35 }
    otherUsers.forEach((u) => {
      const arr = Array.isArray(u.cumulative_by_day) ? u.cumulative_by_day : []
      // Use last known value if user has fewer days than us (they may not
      // have checked in for the current day yet).
      const v = i < arr.length ? arr[i] : (arr.length > 0 ? arr[arr.length - 1] : 0)
      row[`user_${u.id}`] = v
    })
    return row
  })

  // Per-habit bar chart data (weekly)
  const totalWeeks = Math.ceil(CHALLENGE_DAYS / 7)
  const weeklyHabitData = Array.from({ length: totalWeeks }, (_, i) => i).map((week) => {
    const weekDates = allDates.slice(week * 7, (week + 1) * 7)
    const isFuture = getDayIndex(weekDates[0]) > dayIndex
    if (isFuture) return null

    const entry = { week: `W${week + 1}` }
    entry.nutrition = weekDates.reduce((s, d) => s + Math.max(0, data[d]?.nutrition || 0), 0)
    HABITS.forEach((h) => {
      entry[h.id] = weekDates.reduce((s, d) => {
        const val = data[d]?.[h.id]
        const done = val === true || (val && typeof val === 'object' && val.completed)
        return s + (done ? 5 : 0)
      }, 0)
    })
    return entry
  }).filter(Boolean)

  // Exercise duration stats
  const weeklyExercise = getWeeklyExerciseMinutes(data, allDates, dayIndex)
  const activityBreakdown = getActivityTypeBreakdown(data, allDates, dayIndex)
  const durationTrend = getDailyDurationTrend(data, allDates, dayIndex)
  const hasExerciseDuration = durationTrend.some((d) => d.exercise > 0 || d.mobilize > 0)

  // Recovery/strain trend
  const recoveryTrend = getRecoveryTrend(data, allDates, dayIndex)
  const hasRecoveryData = recoveryTrend.some((d) => d.recovery != null)

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: colors.textDim }}>Loading...</div>
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 300, marginBottom: 20, textAlign: 'center' }}>
        Your Journey
      </h2>

      <div className="wlc-charts-grid">
      {/* Daily Score Chart */}
      <div style={{ background: colors.surface, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, paddingLeft: 8 }}>Daily Score</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.accent} stopOpacity={0.4} />
                <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 35]} tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{ background: colors.surfaceHover, border: `1px solid ${colors.borderSubtle}`, borderRadius: 8, color: colors.text, fontSize: 12 }}
              formatter={(v) => [`${v}/35`, 'Score']}
              labelFormatter={(l) => `Day ${l}`}
            />
            <Area type="monotone" dataKey="score" stroke={colors.accent} strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Score Chart with comparison overlay */}
      <div style={{ background: colors.surface, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, paddingLeft: 8 }}>
          Cumulative Score{otherUsers.length > 0 ? ` (vs ${otherUsers.length} ${otherUsers.length === 1 ? 'other' : 'others'})` : ''}
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={cumulativeData}>
            <defs>
              <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.blue} stopOpacity={0.4} />
                <stop offset="100%" stopColor={colors.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              contentStyle={{ background: colors.surfaceHover, border: `1px solid ${colors.borderSubtle}`, borderRadius: 8, color: colors.text, fontSize: 12 }}
              formatter={(v, name) => {
                if (name === 'total') return [v, 'You']
                if (name === 'perfectPace') return [v, 'Perfect pace']
                const userId = name.replace('user_', '')
                const u = otherUsers.find((x) => x.id === userId)
                return [v, u?.display_name || 'Player']
              }}
              labelFormatter={(l) => `Day ${l}`}
            />
            <Area type="monotone" dataKey="perfectPace" stroke={colors.textGhost} strokeWidth={1} strokeDasharray="4 4" fill="none" dot={false} />
            {/* Other users' lines (faded) */}
            {otherUsers.map((u, i) => (
              <Line
                key={u.id}
                type="monotone"
                dataKey={`user_${u.id}`}
                stroke={OVERLAY_COLORS[i % OVERLAY_COLORS.length]}
                strokeWidth={1.5}
                strokeOpacity={0.6}
                dot={false}
              />
            ))}
            {/* Your line on top */}
            <Area type="monotone" dataKey="total" stroke={colors.blue} strokeWidth={2.5} fill="url(#cumulGrad)" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
        {otherUsers.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '4px 8px 4px', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, color: colors.blue, fontWeight: 600 }}>{'\u25CF'} You</span>
            {otherUsers.map((u, i) => (
              <span key={u.id} style={{ fontSize: 11, color: OVERLAY_COLORS[i % OVERLAY_COLORS.length] }}>
                {'\u25CF'} {u.display_name || 'Player'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Per-Habit Bar Chart (NEW) */}
      <div style={{ background: colors.surface, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, paddingLeft: 8 }}>Habit Breakdown (Weekly)</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyHabitData}>
            <XAxis dataKey="week" tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
            <Tooltip
              contentStyle={{ background: colors.surfaceHover, border: `1px solid ${colors.borderSubtle}`, borderRadius: 8, color: colors.text, fontSize: 12 }}
            />
            <Bar dataKey="nutrition" stackId="a" fill={colors.accent} name="Nutrition" />
            {HABITS.map((h) => (
              <Bar key={h.id} dataKey={h.id} stackId="a" fill={h.color} name={h.label} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      </div>

      {/* Exercise Duration Charts — only shown when duration data exists */}
      {hasExerciseDuration && (
        <div className="wlc-charts-grid" style={{ marginTop: 16 }}>
          {/* Weekly Exercise Minutes */}
          <div style={{ background: colors.surface, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16, border: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, paddingLeft: 8 }}>Weekly Active Minutes</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyExercise}>
                <XAxis dataKey="week" tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: colors.surfaceHover, border: `1px solid ${colors.borderSubtle}`, borderRadius: 8, color: colors.text, fontSize: 12 }}
                  formatter={(v, name) => [`${v} min`, name === 'exercise' ? 'Exercise' : 'Mobilize']}
                />
                <Bar dataKey="exercise" stackId="a" fill={colors.accent} name="exercise" />
                <Bar dataKey="mobilize" stackId="a" fill={colors.orange} name="mobilize" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Duration Trend */}
          <div style={{ background: colors.surface, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16, border: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, paddingLeft: 8 }}>Duration Trend</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={durationTrend}>
                <XAxis dataKey="day" tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ background: colors.surfaceHover, border: `1px solid ${colors.borderSubtle}`, borderRadius: 8, color: colors.text, fontSize: 12 }}
                  formatter={(v, name) => [`${v} min`, name === 'exercise' ? 'Exercise' : 'Mobilize']}
                  labelFormatter={(l) => `Day ${l}`}
                />
                <Line type="monotone" dataKey="exercise" stroke={colors.accent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="mobilize" stroke={colors.orange} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Activity Type Breakdown */}
      {activityBreakdown.length > 0 && (
        <div style={{ background: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${colors.border}` }}>
          <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Activity Breakdown</p>
          {activityBreakdown.map(({ type, minutes }) => {
            const maxMin = activityBreakdown[0].minutes
            const pct = Math.round((minutes / maxMin) * 100)
            return (
              <div key={type} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: colors.textMuted }}>{type}</span>
                  <span style={{ color: colors.text, fontWeight: 600 }}>{minutes} min</span>
                </div>
                <div style={{ height: 6, background: colors.surfaceHover, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: colors.accent, borderRadius: 3, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Recovery & Strain Chart — only shown when self-report data exists */}
      {hasRecoveryData && (
        <div style={{ background: colors.surface, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16, border: `1px solid ${colors.border}` }}>
          <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, paddingLeft: 8 }}>Recovery & Strain</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={recoveryTrend}>
              <XAxis dataKey="day" tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="recovery" domain={[0, 100]} tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <YAxis yAxisId="strain" orientation="right" domain={[0, 21]} tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ background: colors.surfaceHover, border: `1px solid ${colors.borderSubtle}`, borderRadius: 8, color: colors.text, fontSize: 12 }}
                formatter={(v, name) => {
                  if (v == null) return ['—', name]
                  return [name === 'recovery' ? `${v}/100` : `${v}/21`, name === 'recovery' ? 'Recovery' : 'Strain']
                }}
                labelFormatter={(l) => `Day ${l}`}
              />
              <Line yAxisId="recovery" type="monotone" dataKey="recovery" stroke={colors.green} strokeWidth={2} dot={false} connectNulls />
              <Line yAxisId="strain" type="monotone" dataKey="strain" stroke={colors.accent} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4, paddingBottom: 4 }}>
            <span style={{ fontSize: 11, color: colors.green }}>{'\u25CF'} Recovery (0-100)</span>
            <span style={{ fontSize: 11, color: colors.accent }}>{'\u25CF'} Strain (0-21)</span>
          </div>
        </div>
      )}

      {/* Habit Heatmap */}
      <div style={{ background: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Habit Heatmap</p>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 500 }}>
            {/* Nutrition row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: colors.textDim, width: 60, flexShrink: 0 }}>Nutrition</span>
              <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap' }}>
                {visibleDates.map((d, i) => {
                  const v = data[d]?.nutrition ?? -1
                  const opacity = v < 0 ? 0.1 : v / 5
                  return <div key={i} title={`Day ${i + 1}: ${v < 0 ? '\u2014' : v}`} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(232, 99, 74, ${Math.max(0.1, opacity)})` }} />
                })}
              </div>
            </div>
            {HABITS.map((h) => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12, color: colors.textDim, width: 60, flexShrink: 0 }}>{h.label}</span>
                <div style={{ display: 'flex', gap: 2, flexWrap: 'nowrap' }}>
                  {visibleDates.map((d, i) => {
                    const val = data[d]?.[h.id]
                    const done = val === true || (val && typeof val === 'object' && val.completed)
                    return <div key={i} title={`Day ${i + 1}`} style={{ width: 10, height: 10, borderRadius: 2, background: done ? h.color : colors.surfaceHover }} />
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Totals */}
      <div style={{ background: colors.surface, borderRadius: 14, padding: 16, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>Weekly Totals</p>
        {Array.from({ length: totalWeeks }, (_, i) => i).map((week) => {
          const weekDates = allDates.slice(week * 7, (week + 1) * 7)
          const weekScore = weekDates.reduce((s, d) => s + scoreDay(data[d]), 0)
          const weekMax = weekDates.length * 35
          const weekPct = weekMax > 0 ? Math.round((weekScore / weekMax) * 100) : 0
          const isFuture = getDayIndex(weekDates[0]) > dayIndex
          if (isFuture) return null
          return (
            <div key={week} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: colors.textDim }}>Week {week + 1}</span>
                <span style={{ color: colors.text, fontWeight: 600 }}>{weekScore}/{weekMax} <span style={{ color: colors.textFaint }}>({weekPct}%)</span></span>
              </div>
              <div style={{ height: 6, background: colors.surfaceHover, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${weekPct}%`, background: `linear-gradient(90deg, ${colors.accent}, ${colors.orange})`, borderRadius: 3, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
