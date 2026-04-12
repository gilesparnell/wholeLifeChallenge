import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { HABITS } from '../lib/habits'
import { scoreDay } from '../lib/scoring'
import { getDayIndex, getToday, getAllDates, CHALLENGE_DAYS } from '../lib/dates'
import { useData } from '../contexts/DataContext'
import { colors, fonts } from '../styles/theme'

export default function Progress() {
  const { data, loading } = useData()

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

  // Cumulative score chart data
  let cumulative = 0
  const cumulativeData = visibleDates.map((d, i) => {
    cumulative += scoreDay(data[d])
    return { day: i + 1, total: cumulative, perfectPace: (i + 1) * 35 }
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

      {/* Cumulative Score Chart (NEW) */}
      <div style={{ background: colors.surface, borderRadius: 14, padding: '16px 8px 8px', marginBottom: 16, border: `1px solid ${colors.border}` }}>
        <p style={{ fontSize: 12, color: colors.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, paddingLeft: 8 }}>Cumulative Score</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={cumulativeData}>
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
              formatter={(v, name) => [v, name === 'total' ? 'Your Score' : 'Perfect Pace']}
              labelFormatter={(l) => `Day ${l}`}
            />
            <Area type="monotone" dataKey="perfectPace" stroke={colors.textGhost} strokeWidth={1} strokeDasharray="4 4" fill="none" dot={false} />
            <Area type="monotone" dataKey="total" stroke={colors.blue} strokeWidth={2} fill="url(#cumulGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
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
