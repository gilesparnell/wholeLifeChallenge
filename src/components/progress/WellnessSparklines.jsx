import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts'
import { colors, fonts } from '../../styles/theme'

const FIELDS = [
  { key: 'mood', label: 'Mood', color: '#f59e0b' },
  { key: 'energyLevel', label: 'Energy', color: '#10b981' },
  { key: 'stressLevel', label: 'Stress', color: '#ef4444', invert: true },
  { key: 'soreness', label: 'Soreness', color: '#8b5cf6', invert: true },
]

const avg = (series) => {
  if (!series || series.length === 0) return null
  return series.reduce((s, p) => s + p.value, 0) / series.length
}

/**
 * Small-multiples of self-reported wellness metrics. Each field is
 * rendered as a tiny sparkline with its current latest value and
 * rolling average. Hides entirely when there's no self-report data.
 */
export default function WellnessSparklines({ trends }) {
  if (!trends) return null
  const anyData = FIELDS.some((f) => trends[f.key] && trends[f.key].length >= 2)
  if (!anyData) return null

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
        Wellness Signals
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
        }}
      >
        {FIELDS.map(({ key, label, color }) => {
          const series = trends[key] || []
          if (series.length < 2) return null
          const latest = series[series.length - 1]?.value
          const average = avg(series)
          return (
            <div
              key={key}
              style={{
                background: colors.bg,
                borderRadius: 10,
                padding: '10px 12px',
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: colors.textFaint,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    fontWeight: 600,
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 16,
                    color: colors.text,
                  }}
                >
                  {latest}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={32}>
                <LineChart data={series}>
                  <YAxis domain={[1, 5]} hide />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p style={{ fontSize: 10, color: colors.textFaint, textAlign: 'right', marginTop: 2 }}>
                avg {average?.toFixed(1)}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
