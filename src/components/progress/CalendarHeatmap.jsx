import { colors } from '../../styles/theme'

const CELL_SIZE = 14
const CELL_GAP = 3
const COLS = 7

const colorFor = (intensity, isFuture) => {
  if (isFuture) return colors.surfaceHover
  if (intensity <= 0) return colors.surfaceHover
  if (intensity < 0.25) return '#1e3a2e'
  if (intensity < 0.5) return '#2e6845'
  if (intensity < 0.75) return '#3fa268'
  if (intensity < 0.95) return '#5dc785'
  return colors.accent
}

/**
 * Whole-challenge calendar heatmap. Hand-rolled SVG so we don't pull
 * in a charting dep for something this simple. 7 cells per row.
 */
export default function CalendarHeatmap({ data }) {
  if (!data || data.length === 0) return null

  const rows = Math.ceil(data.length / COLS)
  const width = COLS * CELL_SIZE + (COLS - 1) * CELL_GAP
  const height = rows * CELL_SIZE + (rows - 1) * CELL_GAP

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
        Challenge Heatmap
      </p>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Challenge heatmap — one square per day"
        role="img"
      >
        {data.map((d, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x = col * (CELL_SIZE + CELL_GAP)
          const y = row * (CELL_SIZE + CELL_GAP)
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              fill={colorFor(d.intensity, d.future)}
            >
              <title>
                Day {d.day} &mdash; {d.score}/35
                {d.future ? ' (future)' : ''}
              </title>
            </rect>
          )
        })}
      </svg>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 10,
          fontSize: 10,
          color: colors.textFaint,
          justifyContent: 'flex-end',
        }}
      >
        <span>less</span>
        {[0.1, 0.3, 0.6, 0.85, 1].map((v) => (
          <span
            key={v}
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 2,
              background: colorFor(v, false),
            }}
          />
        ))}
        <span>more</span>
      </div>
    </div>
  )
}
