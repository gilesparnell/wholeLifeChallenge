import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { colors } from '../../styles/theme'

const chartHeadingStyle = {
  fontSize: 12,
  color: colors.textDim,
  textTransform: 'uppercase',
  letterSpacing: 2,
  marginBottom: 12,
  paddingLeft: 8,
}

/**
 * Daily hydration bar chart with each bar coloured green when the
 * user hit their target for that day, dim otherwise. Shows the
 * effective target as a dashed reference line.
 */
export default function HydrationProgressChart({ data, effectiveTargetMl }) {
  if (!data || data.length < 3) return null

  const hitCount = data.filter((d) => d.hit).length

  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: 14,
        padding: '16px 8px 8px',
        marginBottom: 16,
        border: `1px solid ${colors.border}`,
      }}
    >
      <p style={chartHeadingStyle}>Hydration</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data}>
          <XAxis
            dataKey="day"
            tick={{ fill: colors.textGhost, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: colors.textGhost, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: colors.surfaceHover,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 8,
              color: colors.text,
              fontSize: 12,
            }}
            formatter={(v) => [`${v} ml`, 'Water']}
            labelFormatter={(l) => `Day ${l}`}
          />
          <ReferenceLine
            y={effectiveTargetMl}
            stroke={colors.accent}
            strokeDasharray="3 3"
            strokeWidth={1}
            ifOverflow="extendDomain"
          />
          <Bar dataKey="ml" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.hit ? colors.accent : colors.textFaint} fillOpacity={d.hit ? 0.9 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: 4 }}>
        Hit target on {hitCount} / {data.length} days &middot; Target: {effectiveTargetMl} ml
      </p>
    </div>
  )
}
