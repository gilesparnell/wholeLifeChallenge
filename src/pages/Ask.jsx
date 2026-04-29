import { useState, useEffect } from 'react'
import { useData } from '../contexts/DataContext'
import { colors, fonts } from '../styles/theme'
import { getDayIndex, getToday, getAllDates, getChallengeDays } from '../lib/dates'
import { buildQueryContext } from '../lib/queryContext'

const EXAMPLES = [
  'Why is my streak 0?',
  'Which habit am I worst at?',
  'Am I on track to finish strong?',
  'How does the scoring work?',
]

const HISTORY_KEY = 'wlc-ask-history'
const loadHistory = () => {
  try { return JSON.parse(sessionStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

export default function Ask() {
  const { data } = useData()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState(loadHistory)

  const today = getToday()
  const allDates = getAllDates()
  const dayIndex = getDayIndex(today)
  const challengeDays = getChallengeDays()

  useEffect(() => {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history)) } catch { /* ignore */ }
  }, [history])

  const submit = async (q) => {
    const text = (q ?? question).trim()
    if (!text || loading) return

    setLoading(true)
    setError(null)

    const context = buildQueryContext(data, allDates, dayIndex, challengeDays)

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, context }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Something went wrong')
      setHistory((h) => [{ question: text, answer: json.answer }, ...h].slice(0, 10))
      setQuestion('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const latestAnswer = history[0] ?? null

  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 22, fontWeight: 300, marginBottom: 4 }}>
        Ask about your challenge
      </h2>
      <p style={{ fontSize: 13, color: colors.textDim, marginBottom: 20 }}>
        Ask anything about your scores, habits, or progress.
      </p>

      {/* Input */}
      <div style={{ background: colors.surface, borderRadius: 14, padding: 16, border: `1px solid ${colors.border}`, marginBottom: 16 }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          placeholder="e.g. Why is my streak 0?"
          rows={2}
          maxLength={500}
          style={{
            width: '100%', resize: 'none', background: 'transparent',
            border: 'none', color: colors.text, fontFamily: fonts.body,
            fontSize: 15, lineHeight: 1.5, outline: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 11, color: colors.textGhost }}>{question.length}/500</span>
          <button
            onClick={() => submit()}
            disabled={!question.trim() || loading}
            style={{
              background: question.trim() && !loading ? colors.accent : colors.surfaceHover,
              color: question.trim() && !loading ? '#fff' : colors.textFaint,
              border: 'none', borderRadius: 8, padding: '8px 18px',
              fontFamily: fonts.body, fontSize: 13, fontWeight: 600,
              cursor: question.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
            }}
          >
            {loading ? 'Thinking…' : 'Ask'}
          </button>
        </div>
      </div>

      {/* Example prompts — always visible */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 11, color: colors.textGhost, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Try asking</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => submit(ex)}
              disabled={loading}
              style={{
                background: colors.surface, border: `1px solid ${colors.border}`,
                borderRadius: 20, padding: '6px 14px',
                color: loading ? colors.textGhost : colors.textDim,
                fontSize: 12, fontFamily: fonts.body, cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 32, color: colors.textDim, fontSize: 14 }}>
          Analysing your data…
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: `${colors.accent}22`, border: `1px solid ${colors.accent}44`, borderRadius: 12, padding: 16, color: colors.accent, fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Latest answer */}
      {!loading && latestAnswer && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, color: colors.textGhost, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>
            {latestAnswer.question}
          </p>
          <div style={{ background: colors.surface, borderRadius: 14, padding: 20, border: `1px solid ${colors.border}` }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: colors.text, whiteSpace: 'pre-wrap' }}>{latestAnswer.answer}</p>
          </div>
        </div>
      )}

      {/* Earlier this session */}
      {history.length > 1 && (
        <div>
          <p style={{ fontSize: 11, color: colors.textGhost, marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Earlier this session</p>
          {history.slice(1).map((item, i) => (
            <div key={i} style={{ marginBottom: 12, borderLeft: `2px solid ${colors.border}`, paddingLeft: 12 }}>
              <p style={{ fontSize: 12, color: colors.textDim, marginBottom: 4 }}>{item.question}</p>
              <p style={{ fontSize: 13, color: colors.textFaint, lineHeight: 1.6 }}>{item.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
