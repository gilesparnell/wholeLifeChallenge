import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ZAxis, CartesianGrid } from 'recharts'
import { colors } from '../../styles/theme'

const WEEK_COLORS = [
  '#38bfa0', // teal (accent)
  '#6B5CE7', // purple
  '#C87F2A', // orange
  '#D14A7A', // pink
  '#2E8BC0', // blue
  '#7BAE38', // lime
  '#A0522D', // sienna
  '#5F4B8B', // indigo
  '#EC4899', // hot pink
  '#14B8A6', // teal2
  '#F59E0B', // amber
  '#8B5CF6', // violet
]

/**
 * 2-axis scatter of Recovery (0-100) vs Strain (0-21). Each dot is
 * one day, colour-coded by challenge week. High recovery + high
 * strain = optimal; low recovery + high strain = overtraining.
 */
export default function RecoveryStrainScatter({ trend }) {
  if (!trend || trend.length === 0) return null
  const points = trend.filter((d) => d.recovery != null && d.strain != null)
  if (points.length < 3) return null

  // Group by week for colour-coding
  const byWeek = {}
  points.forEach((d) => {
    const week = Math.floor((d.day - 1) / 7)
    if (!byWeek[week]) byWeek[week] = []
    byWeek[week].push({ x: d.strain, y: d.recovery, day: d.day })
  })

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
      <p
        style={{
          fontSize: 12,
          color: colors.textDim,
          textTransform: 'uppercase',
          letterSpacing: 2,
          marginBottom: 12,
          paddingLeft: 8,
        }}
      >
        Recovery x Strain
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.borderSubtle} />
          <XAxis
            type="number"
            dataKey="x"
            name="Strain"
            domain={[0, 21]}
            tick={{ fill: colors.textGhost, fontSize: 10 }}
            label={{ value: 'Strain', position: 'insideBottom', offset: -8, fill: colors.textFaint, fontSize: 11 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Recovery"
            domain={[0, 100]}
            tick={{ fill: colors.textGhost, fontSize: 10 }}
            label={{ value: 'Recovery', angle: -90, position: 'insideLeft', fill: colors.textFaint, fontSize: 11 }}
          />
          <ZAxis range={[60, 100]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              background: colors.surfaceHover,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 8,
              color: colors.text,
              fontSize: 12,
            }}
            formatter={(v, name) => [v, name === 'x' ? 'Strain' : 'Recovery']}
            labelFormatter={() => ''}
          />
          {Object.entries(byWeek).map(([week, pts]) => (
            <Scatter
              key={week}
              data={pts}
              fill={WEEK_COLORS[week % WEEK_COLORS.length]}
              fillOpacity={0.75}
              stroke={WEEK_COLORS[week % WEEK_COLORS.length]}
              strokeOpacity={0.9}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <p style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: 4, paddingBottom: 4 }}>
        Top-right = high recovery, high strain. Bottom-right = risk zone.
      </p>
    </div>
  )
}
