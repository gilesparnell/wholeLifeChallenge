import { colors, fonts } from '../../styles/theme'

const FIELD_LABELS = {
  nutrition: 'nutrition score',
  score: 'daily score',
  sleepHours: 'sleep hours',
  sleepQuality: 'sleep quality',
  energyLevel: 'energy',
  stressLevel: 'stress',
  mood: 'mood',
  hydrateMl: 'water intake',
  exerciseMinutes: 'exercise minutes',
}

const INVERT_INTERPRETATION = new Set(['stressLevel'])

const describe = (x, y, r) => {
  const xLabel = FIELD_LABELS[x] || x
  const yLabel = FIELD_LABELS[y] || y
  const magnitude = Math.abs(r)
  const strength = magnitude >= 0.7 ? 'strong' : magnitude >= 0.5 ? 'clear' : 'mild'
  const isNegative = r < 0 !== INVERT_INTERPRETATION.has(x)
  const verb = isNegative ? 'lower' : 'higher'
  return `Days with higher ${xLabel} had ${verb} ${yLabel} (${strength}, r = ${r.toFixed(2)})`
}

/**
 * Renders a set of correlation cards when there's enough data, or a
 * friendly placeholder otherwise. Each card surfaces a Pearson r
 * already filtered by the helper (|r| >= 0.3, n >= 7).
 */
export default function CorrelationInsights({ correlations, enoughData }) {
  if (!enoughData) {
    return (
      <div
        style={{
          background: colors.surface,
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          border: `1px solid ${colors.border}`,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: colors.textDim,
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          Patterns
        </p>
        <p style={{ fontSize: 13, color: colors.textFaint }}>
          Come back in a week &mdash; we&rsquo;ll spot patterns once there&rsquo;s enough data.
        </p>
      </div>
    )
  }

  if (!correlations || correlations.length === 0) {
    return (
      <div
        style={{
          background: colors.surface,
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          border: `1px solid ${colors.border}`,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: colors.textDim,
            textTransform: 'uppercase',
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          Patterns
        </p>
        <p style={{ fontSize: 13, color: colors.textFaint }}>
          Nothing standing out yet. That usually means your habits are balanced &mdash; no single metric is dragging the others around.
        </p>
      </div>
    )
  }

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
        Patterns we&rsquo;re seeing
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {correlations.slice(0, 5).map((c, i) => (
          <div
            key={`${c.x}-${c.y}-${i}`}
            style={{
              background: colors.bg,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: colors.text,
                fontFamily: fonts.body,
                lineHeight: 1.4,
                margin: 0,
              }}
            >
              {describe(c.x, c.y, c.r)}
            </p>
            <p
              style={{
                fontSize: 10,
                color: colors.textFaint,
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              n = {c.n} days
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
