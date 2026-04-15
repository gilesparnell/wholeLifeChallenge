import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { colors } from '../../styles/theme'
import Help from '../Help'

/**
 * Line chart showing the user's delta to the group average cumulative
 * score over time. Positive = ahead, negative = behind. Includes a
 * small info tooltip on the heading because peer data is a privacy-
 * adjacent thing to surface.
 */
export default function PeerDeltaChart({ delta, peerCount }) {
  if (!delta || delta.length < 3 || peerCount <= 0) return null

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
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        You vs Group Average
        <Help title="You vs Group Average">
          <p>
            The line shows how far ahead or behind you are compared to the average
            of everyone else on the leaderboard. Above the zero line means you&rsquo;re
            ahead; below means there&rsquo;s ground to make up.
          </p>
          <p>
            <strong>What&rsquo;s shared:</strong> exactly the same public cumulative
            score data that already shows on the leaderboard &mdash; nothing new.
            Players who&rsquo;ve opted out of the leaderboard don&rsquo;t appear here
            either.
          </p>
        </Help>
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={delta}>
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
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: colors.surfaceHover,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 8,
              color: colors.text,
              fontSize: 12,
            }}
            formatter={(v, name) => {
              if (name === 'delta') return [v > 0 ? `+${v}` : v, 'Delta']
              if (name === 'user') return [v, 'You']
              if (name === 'peerAvg') return [Math.round(v), 'Group avg']
              return [v, name]
            }}
            labelFormatter={(l) => `Day ${l}`}
          />
          <ReferenceLine y={0} stroke={colors.textGhost} strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="delta"
            stroke={colors.accent}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
