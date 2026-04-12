import { scoreDay } from '../lib/scoring'
import { getDayIndex, getToday, getAllDates, formatDate, CHALLENGE_DAYS } from '../lib/dates'
import { useData } from '../contexts/DataContext'
import { colors, fonts } from '../styles/theme'

export default function Journal() {
  const { data, loading } = useData()

  const today = getToday()
  const dayIndex = getDayIndex(today)
  const allDates = getAllDates()
  const lastDataIndex = allDates.reduce((max, d, i) => (data[d] ? i : max), -1)
  const visibleEnd = Math.max(dayIndex + 1, lastDataIndex + 1)
  const visibleDates = allDates.slice(0, Math.min(visibleEnd, CHALLENGE_DAYS))

  const getReflectionText = (entry) => {
    if (!entry) return null
    // Support both legacy and new formats
    if (entry.reflect?.reflection_text) return entry.reflect.reflection_text
    if (entry.reflection) return entry.reflection
    return null
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: colors.textDim }}>Loading...</div>
  }

  const hasReflections = visibleDates.some((d) => getReflectionText(data[d]))

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 300, marginBottom: 20, textAlign: 'center' }}>
        Reflections
      </h2>
      {visibleDates.reverse().map((d) => {
        const entry = data[d]
        const text = getReflectionText(entry)
        if (!text) return null
        return (
          <div key={d} style={{
            background: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10,
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#E84A8A' }}>Day {getDayIndex(d) + 1}</span>
              <span style={{ fontSize: 12, color: colors.textFaint }}>{formatDate(d)}</span>
            </div>
            <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>{text}</p>
            <div style={{ marginTop: 8, fontSize: 12, color: colors.textGhost }}>Score: {scoreDay(entry)}/35</div>
          </div>
        )
      })}
      {!hasReflections && (
        <p style={{ textAlign: 'center', color: colors.textGhost, fontSize: 13, marginTop: 40 }}>
          No reflections yet. Write your first one in today's check-in!
        </p>
      )}
    </div>
  )
}
