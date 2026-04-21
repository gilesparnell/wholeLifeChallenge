import { useState } from 'react'
import { scoreDay } from '../lib/scoring'
import { getDayIndex, getToday, getAllDates, formatDate, CHALLENGE_DAYS } from '../lib/dates'
import { useData } from '../contexts/DataContext'
import { useAuth } from '../contexts/AuthContext'
import { useSharedJournal } from '../hooks/useSharedJournal'
import { colors, fonts } from '../styles/theme'
import Help from '../components/Help'
import OwnerSelector from '../components/OwnerSelector'
import ActivityModal from '../components/modals/ActivityModal'

export default function Journal() {
  const { user } = useAuth()
  const selfId = user?.id || null
  const [viewingOwnerId, setViewingOwnerId] = useState(selfId)
  const isSelf = !selfId || viewingOwnerId === selfId

  const { data: selfData, loading: selfLoading, saveDay } = useData()
  const { data: sharedData, loading: sharedLoading } = useSharedJournal(isSelf ? null : viewingOwnerId)

  const data = isSelf ? selfData : sharedData
  const loading = isSelf ? selfLoading : sharedLoading

  const [editDate, setEditDate] = useState(null)

  const today = getToday()
  const dayIndex = getDayIndex(today)
  const allDates = getAllDates()
  const lastDataIndex = allDates.reduce((max, d, i) => (data[d] ? i : max), -1)
  const visibleEnd = Math.max(dayIndex + 1, lastDataIndex + 1)
  const visibleDates = allDates.slice(0, Math.min(visibleEnd, CHALLENGE_DAYS))

  const getReflectionText = (entry) => {
    if (!entry) return null
    if (entry.reflect?.reflection_text) return entry.reflect.reflection_text
    if (entry.reflection) return entry.reflection
    return null
  }

  // Editing is only ever allowed for your own reflections.
  const isDateEditable = (dateStr) => {
    if (!isSelf) return false
    const i = getDayIndex(dateStr)
    return i >= 0 && i <= dayIndex && i < CHALLENGE_DAYS
  }

  const handleSaveReflection = (text) => {
    if (!editDate) return
    const currentDay = data[editDate] || {}
    saveDay(editDate, {
      ...currentDay,
      reflect: { completed: text.length > 0, reflection_text: text },
      reflection: text,
    })
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: colors.textDim }}>Loading...</div>
  }

  const hasReflections = visibleDates.some((d) => getReflectionText(data[d]))

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        <span aria-hidden="true" style={{ width: 24, flexShrink: 0 }} />
        <h2 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 300, margin: 0, textAlign: 'center' }}>
          Reflections
        </h2>
        <Help title="Why reflect?">
          <p>
            The Reflect habit is worth 5 points a day, but the real value is longer-term.
            Writing a sentence or two every evening pulls your day out of autopilot and
            gives you something to read back when a week has blurred together.
          </p>
          <p><strong>What to write about:</strong></p>
          <ul>
            <li>What went well today? One specific thing.</li>
            <li>What tripped you up? Was it avoidable?</li>
            <li>Energy, mood, sleep &mdash; how did your body feel?</li>
            <li>One thing you&rsquo;re grateful for.</li>
            <li>One thing you want to do differently tomorrow.</li>
          </ul>
          <p>
            Don&rsquo;t overthink it. Two sentences beats none. The habit is showing up,
            not writing an essay.
          </p>
        </Help>
      </div>
      {selfId && (
        <OwnerSelector
          scope="journal"
          selfId={selfId}
          value={viewingOwnerId || selfId}
          onChange={setViewingOwnerId}
          label="Viewing journal"
        />
      )}
      {visibleDates.slice().reverse().map((d) => {
        const entry = data[d]
        const text = getReflectionText(entry)
        if (!text) return null
        const editable = isDateEditable(d)
        return (
          <div key={d} style={{
            background: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10,
            border: `1px solid ${colors.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#E84A8A' }}>Day {getDayIndex(d) + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: colors.textFaint }}>{formatDate(d)}</span>
                {editable && (
                  <button
                    onClick={() => setEditDate(d)}
                    aria-label={`Edit reflection for ${formatDate(d)}`}
                    style={{
                      background: colors.surfaceHover, border: 'none', borderRadius: 6,
                      padding: '4px 10px', fontSize: 11, fontWeight: 600,
                      color: colors.textDim, cursor: 'pointer', fontFamily: fonts.body,
                      letterSpacing: 0.3,
                    }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            <p style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6 }}>{text}</p>
            {isSelf && (
              <div style={{ marginTop: 8, fontSize: 12, color: colors.textGhost }}>Score: {scoreDay(entry)}/35</div>
            )}
          </div>
        )
      })}
      {!hasReflections && (
        <p style={{ textAlign: 'center', color: colors.textGhost, fontSize: 13, marginTop: 40 }}>
          {isSelf
            ? "No reflections yet. Write your first one in today's check-in!"
            : "This person hasn't shared any reflections yet."}
        </p>
      )}

      <ActivityModal
        isOpen={editDate !== null}
        onClose={() => setEditDate(null)}
        onSave={handleSaveReflection}
        title="Edit reflection"
        placeholder="How did that day go?"
        initialText={editDate ? getReflectionText(data[editDate]) || '' : ''}
      />
    </div>
  )
}
