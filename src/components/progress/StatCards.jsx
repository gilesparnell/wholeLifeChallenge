import { colors, fonts } from '../../styles/theme'

const cardStyle = {
  flex: '1 1 140px',
  background: colors.surface,
  borderRadius: 14,
  border: `1px solid ${colors.border}`,
  padding: '14px 16px',
  minWidth: 0,
}

const labelStyle = {
  fontSize: 10,
  color: colors.textFaint,
  textTransform: 'uppercase',
  letterSpacing: 1.5,
  fontWeight: 600,
  marginBottom: 6,
}

const valueStyle = {
  fontFamily: fonts.display,
  fontSize: 26,
  fontWeight: 400,
  color: colors.text,
  lineHeight: 1.1,
  marginBottom: 2,
}

const footnoteStyle = {
  fontSize: 11,
  color: colors.textDim,
  marginTop: 2,
}

const HABIT_LABELS = {
  nutrition: 'Nutrition',
  exercise: 'Exercise',
  mobilize: 'Mobilise',
  sleep: 'Sleep',
  hydrate: 'Hydrate',
  wellbeing: 'Wellbeing',
  reflect: 'Reflect',
}

export default function StatCards({ stats }) {
  if (!stats) return null

  const bestDayLabel = stats.bestDay
    ? `${stats.bestDay.score}`
    : '—'
  const bestDayFootnote = stats.bestDay
    ? `Day ${stats.bestDay.dayNumber}`
    : 'No data yet'

  const bestWeekLabel = stats.bestWeek
    ? `${stats.bestWeek.total}`
    : '—'
  const bestWeekFootnote = stats.bestWeek
    ? `Week ${stats.bestWeek.weekNumber}`
    : 'No data yet'

  const streakHabitLabel = stats.longestHabitStreak?.habit
    ? HABIT_LABELS[stats.longestHabitStreak.habit] || stats.longestHabitStreak.habit
    : '—'

  return (
    <div
      aria-label="Headline stats"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
      }}
    >
      <div style={cardStyle}>
        <div style={labelStyle}>Total score</div>
        <div style={valueStyle}>{stats.totalScore}</div>
        <div style={footnoteStyle}>
          {stats.maxPossible > 0
            ? `${Math.round((stats.totalScore / stats.maxPossible) * 100)}% of max`
            : '—'}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Best day</div>
        <div style={valueStyle}>{bestDayLabel}</div>
        <div style={footnoteStyle}>{bestDayFootnote}</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Best week</div>
        <div style={valueStyle}>{bestWeekLabel}</div>
        <div style={footnoteStyle}>{bestWeekFootnote}</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Consistency</div>
        <div style={valueStyle}>{stats.consistency}%</div>
        <div style={footnoteStyle}>Days logged</div>
      </div>

      <div style={cardStyle}>
        <div style={labelStyle}>Longest streak</div>
        <div style={valueStyle}>{stats.longestHabitStreak?.days ?? 0}</div>
        <div style={footnoteStyle}>{streakHabitLabel}</div>
      </div>
    </div>
  )
}
