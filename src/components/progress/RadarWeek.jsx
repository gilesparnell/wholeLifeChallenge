import { useState } from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'
import { colors, fonts } from '../../styles/theme'
import { calculateRadarWeek } from '../../lib/progressMetrics'

/**
 * Radar/spider chart showing six-axis balance for a selected week of
 * the challenge. User picks a week via chips above the chart.
 */
export default function RadarWeek({ data, allDates, totalWeeks = 0, currentWeekIndex = 0 }) {
  const [selectedWeek, setSelectedWeek] = useState(currentWeekIndex)

  if (!data || !allDates || totalWeeks <= 0) return null

  const radarData = calculateRadarWeek(data, allDates, selectedWeek)
  const weekOptions = Array.from({ length: totalWeeks }, (_, i) => i)

  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        border: `1px solid ${colors.border}`,
      }}
    >
      <p
        style={{
          fontSize: 12,
          color: colors.textDim,
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 14,
        }}
      >
        Week Balance
      </p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {weekOptions.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setSelectedWeek(w)}
            style={{
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: fonts.body,
              background: w === selectedWeek ? colors.accent : 'transparent',
              color: w === selectedWeek ? colors.bg : colors.textDim,
              border: `1px solid ${w === selectedWeek ? colors.accent : colors.border}`,
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            W{w + 1}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={radarData}>
          <PolarGrid stroke={colors.borderSubtle} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: colors.textDim, fontSize: 11 }}
          />
          <PolarRadiusAxis
            domain={[0, 100]}
            tick={{ fill: colors.textFaint, fontSize: 9 }}
            stroke={colors.borderSubtle}
          />
          <Radar
            name="Balance"
            dataKey="value"
            stroke={colors.accent}
            fill={colors.accent}
            fillOpacity={0.35}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
