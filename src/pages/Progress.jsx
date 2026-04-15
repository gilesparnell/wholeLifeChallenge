import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, ReferenceDot, LineChart, Line, ComposedChart } from 'recharts'
import { HABITS } from '../lib/habits'
import { scoreDay } from '../lib/scoring'
import { getDayIndex, getToday, getAllDates, CHALLENGE_DAYS } from '../lib/dates'
import { getWeeklyExerciseMinutes, getActivityTypeBreakdown, getDailyDurationTrend } from '../lib/exerciseStats'
import { getRecoveryTrend } from '../lib/recovery'
import { fetchLeaderboard, subscribeLeaderboard } from '../lib/leaderboard'
import { computeBonuses } from '../lib/bonuses'
import {
  calculateStatCards,
  calculateHabitStreaks,
  calculatePersonalBest,
  projectCumulative,
} from '../lib/progressMetrics'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { colors, fonts } from '../styles/theme'
import Help from '../components/Help'
import StatCards from '../components/progress/StatCards'
import StreaksStrip from '../components/progress/StreaksStrip'
import BonusProgress from '../components/progress/BonusProgress'

const chartHeadingStyle = {
  fontSize: 12,
  color: colors.textDim,
  textTransform: 'uppercase',
  letterSpacing: 2,
  marginBottom: 12,
  paddingLeft: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
}

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
      try {
        const result = await fetchLeaderboard()
        if (alive) setLeaderboard(result)
      } catch (e) {
        // Silently fail for the comparison overlay — chart still works without others
        console.warn('[progress] leaderboard fetch failed:', e?.message)
        if (alive) setLeaderboard([])
      }
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

  // --- Progress v2 metrics ---
  const statCardsData = calculateStatCards(data, allDates, dayIndex, CHALLENGE_DAYS)
  const habitStreaks = calculateHabitStreaks(data, allDates, dayIndex)
  const bonuses = computeBonuses(data, allDates, dayIndex)
  const { bestDay: personalBestDay } = calculatePersonalBest(data, allDates, dayIndex)
  const projection = projectCumulative(data, allDates, dayIndex, CHALLENGE_DAYS)

  // Fold the projection line into the cumulative chart data. Every logged
  // day gets projected = null so the line doesn't overlap the real "total"
  // line; every future day gets projected = running projection and total
  // = null so Recharts stops drawing the real total there.
  const projectedByDay = new Map(projection.projectedSeries.map((p) => [p.day, p.projected]))
  const cumulativeMaxDay = Math.max(
    cumulativeData.length,
    projection.projectedSeries.length > 0
      ? projection.projectedSeries[projection.projectedSeries.length - 1].day
      : 0
  )
  const cumulativeWithProjection = []
  for (let day = 1; day <= cumulativeMaxDay; day++) {
    const existing = cumulativeData[day - 1]
    if (existing) {
      cumulativeWithProjection.push({ ...existing, projected: null })
    } else if (projectedByDay.has(day)) {
      cumulativeWithProjection.push({
        day,
        total: null,
        perfectPace: day * 35,
        projected: projectedByDay.get(day),
      })
    }
  }
  // Anchor the projection line to the last real cumulative point so it
  // visually starts from where the user actually is right now.
  if (cumulativeData.length > 0 && projection.projectedSeries.length > 0) {
    const anchorIdx = cumulativeData.length - 1
    if (cumulativeWithProjection[anchorIdx]) {
      cumulativeWithProjection[anchorIdx].projected = cumulativeData[anchorIdx].total
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: colors.textDim }}>Loading...</div>
  }

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 300, marginBottom: 20, textAlign: 'center' }}>
        Your Journey
      </h2>

      <StatCards stats={statCardsData} />
      <StreaksStrip streaks={habitStreaks} />
      <BonusProgress bonuses={bonuses} />

      <div className="wlc-charts-grid">
      {/* Daily Score Chart */}
      <div style={{ background: colors.surface, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16, border: `1px solid ${colors.border}` }}>
        <p style={chartHeadingStyle}>
          Daily Score
          <Help title="Daily Score">
            <p>
              Your score for each day of the challenge, out of a possible 35. A perfect
              day is 35/35 &mdash; full nutrition score (5) plus all 6 habits completed
              (5 points each).
            </p>
            <p>
              Use this chart to spot patterns: are weekends weaker than weekdays? Did
              travel wreck a particular week? Where are the wins?
            </p>
          </Help>
        </p>
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
            {personalBestDay && personalBestDay.score > 0 && (
              <ReferenceDot
                x={personalBestDay.dayNumber}
                y={personalBestDay.score}
                r={5}
                fill={colors.orange}
                stroke={colors.surface}
                strokeWidth={2}
                isFront
                ifOverflow="extendDomain"
                label={{
                  value: '\u2605',
                  position: 'top',
                  fill: colors.orange,
                  fontSize: 14,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        {personalBestDay && personalBestDay.score > 0 && (
          <p style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: 6, paddingBottom: 4 }}>
            <span style={{ color: colors.orange }}>{'\u2605'}</span> Personal best: day {personalBestDay.dayNumber} &middot; {personalBestDay.score}/35
          </p>
        )}
      </div>

      {/* Cumulative Score Chart with comparison overlay */}
      <div style={{ background: colors.surface, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16, border: `1px solid ${colors.border}` }}>
        <p style={chartHeadingStyle}>
          Cumulative Score{otherUsers.length > 0 ? ` (vs ${otherUsers.length} ${otherUsers.length === 1 ? 'other' : 'others'})` : ''}
          <Help title="Cumulative Score">
            <p>
              Your running total across the whole challenge. The dashed line is
              &ldquo;perfect pace&rdquo; &mdash; where you&rsquo;d be if you scored
              35/35 every single day.
            </p>
            <p>
              Staying above the dashed line means you&rsquo;re on a perfect run. Falling
              below just means there&rsquo;s ground to make up &mdash; not that the
              challenge is lost.
            </p>
            <p>
              If other players are visible, their lines are faded so you can compare
              without the chart turning into spaghetti. Your line is always the solid one.
            </p>
          </Help>
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={cumulativeWithProjection}>
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
                if (name === 'projected') return [v, 'At current pace']
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
            <Area type="monotone" dataKey="total" stroke={colors.blue} strokeWidth={2.5} fill="url(#cumulGrad)" dot={false} connectNulls={false} />
            {/* "At current pace" projection — dotted, reads as a forecast */}
            {projection.projectedSeries.length > 0 && (
              <Line
                type="monotone"
                dataKey="projected"
                stroke={colors.blue}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
                dot={false}
                connectNulls={true}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        {projection.projectedSeries.length > 0 && (
          <p style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: 6, paddingBottom: 4 }}>
            At current pace, finishing on <strong style={{ color: colors.text }}>{projection.projectedTotal}</strong> / {CHALLENGE_DAYS * 35}
          </p>
        )}
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
        <p style={chartHeadingStyle}>
          Habit Breakdown (Weekly)
          <Help title="Habit Breakdown (Weekly)">
            <p>
              A week-by-week look at which habits you&rsquo;re nailing and which you&rsquo;re
              dropping. Each bar is one week, split by habit.
            </p>
            <p>
              Good for spotting your weak link. If the same habit keeps coming up short
              week after week, that&rsquo;s where the easy points are hiding.
            </p>
          </Help>
        </p>
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
            <p style={chartHeadingStyle}>
              Weekly Active Minutes
              <Help title="Weekly Active Minutes">
                <p>
                  Total minutes of exercise + mobility logged per week. Includes everything
                  you recorded on the Exercise and Mobilize habit cards. Good sanity-check
                  that you&rsquo;re not just ticking the box with 5-minute walks.
                </p>
              </Help>
            </p>
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
            <p style={chartHeadingStyle}>
              Duration Trend
              <Help title="Duration Trend">
                <p>
                  Daily session length across the challenge. Use it to check whether
                  you&rsquo;re building capacity (sessions getting longer) or just holding
                  steady. A flat line at your minimum is still a win &mdash; consistency
                  beats heroic one-offs.
                </p>
              </Help>
            </p>
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
          <p style={{ ...chartHeadingStyle, paddingLeft: 0 }}>
            Activity Breakdown
            <Help title="Activity Breakdown">
              <p>
                Which types of exercise you&rsquo;re doing, as a share of total active minutes.
                Helpful for balancing training &mdash; if it&rsquo;s 95% running, your hips
                and shoulders are probably screaming for a yoga or mobility session.
              </p>
            </Help>
          </p>
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
          <p style={chartHeadingStyle}>
          Recovery &amp; Strain
          <Help title="Recovery & Strain">
            <p>
              Two lines, two stories. <strong>Recovery</strong> (0&ndash;100) is
              calculated from your How Do You Feel? ratings &mdash; sleep, energy, mood,
              soreness and stress. <strong>Strain</strong> (0&ndash;21) is how physically
              taxing your exercise and mobility work was.
            </p>
            <p>
              The goal isn&rsquo;t to max one and ignore the other. High strain with
              climbing recovery = adapting well. High strain with falling recovery =
              pump the brakes before you burn out or get injured.
            </p>
            <p>
              Inspired by the WHOOP model but calculated locally from your own data.
            </p>
          </Help>
        </p>
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
        <p style={{ ...chartHeadingStyle, paddingLeft: 0 }}>
          Habit Heatmap
          <Help title="Habit Heatmap">
            <p>
              A day-by-day grid for each habit across the full challenge. Filled squares
              mean the habit was completed that day; empty squares mean a miss.
            </p>
            <p>
              Patterns jump out fast here &mdash; long streaks look solid, broken streaks
              look patchy, and missed days cluster around specific weekdays if that&rsquo;s
              a pattern for you.
            </p>
          </Help>
        </p>
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
        <p style={{ ...chartHeadingStyle, paddingLeft: 0 }}>
          Weekly Totals
          <Help title="Weekly Totals">
            <p>
              Your score rolled up by challenge week. Useful when the daily chart gets
              noisy &mdash; weekly totals smooth out a bad Tuesday and show you the real
              trajectory.
            </p>
          </Help>
        </p>
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
