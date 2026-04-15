import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts'
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
 * Line chart of nightly sleep hours with a target band around the
 * user's sleepTargetHours. Hides entirely when there are fewer than
 * 3 data points — one or two nights isn't a trend.
 */
export default function SleepHoursChart({ trend, targetHours = 8 }) {
  if (!trend || trend.length < 3) return null

  const bandLow = Math.max(0, targetHours - 1)
  const bandHigh = targetHours + 1

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
      <p style={chartHeadingStyle}>Sleep Hours</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={trend}>
          <XAxis dataKey="day" tick={{ fill: colors.textGhost, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, 12]}
            tick={{ fill: colors.textGhost, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: colors.surfaceHover,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 8,
              color: colors.text,
              fontSize: 12,
            }}
            formatter={(v) => [`${v} h`, 'Sleep']}
            labelFormatter={(l) => `Day ${l}`}
          />
          <ReferenceArea
            y1={bandLow}
            y2={bandHigh}
            fill={colors.accent}
            fillOpacity={0.08}
            stroke={colors.accent}
            strokeOpacity={0.25}
            strokeWidth={1}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.accent}
            strokeWidth={2}
            dot={{ r: 3, fill: colors.accent, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p style={{ fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: 4 }}>
        Target band: {bandLow}&ndash;{bandHigh} h
      </p>
    </div>
  )
}
