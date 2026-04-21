import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { colors, fonts } from '../styles/theme'

const VIEW_BY_SCOPE = {
  journal: 'shared_journal_entries',
  wellness: 'shared_wellness_entries',
  exercise: 'shared_exercise_entries',
}

// "insights" is a virtual scope — union of wellness + exercise. Used on
// the Progress page so a sharer shows up if they've granted EITHER.
const viewsFor = (scope) => {
  if (scope === 'insights') return [VIEW_BY_SCOPE.wellness, VIEW_BY_SCOPE.exercise]
  return VIEW_BY_SCOPE[scope] ? [VIEW_BY_SCOPE[scope]] : []
}

export default function OwnerSelector({ scope, selfId, value, onChange, label = 'Viewing' }) {
  const [sharers, setSharers] = useState([])

  useEffect(() => {
    let cancelled = false
    const views = viewsFor(scope)
    if (views.length === 0 || !supabase) return

    Promise.all(
      views.map((view) =>
        supabase.from(view).select('owner_id, owner_name'),
      ),
    ).then((results) => {
      if (cancelled) return
      const seen = new Map()
      for (const { data, error } of results) {
        if (error || !data) continue
        for (const row of data) {
          if (!row || !row.owner_id) continue
          if (row.owner_id === selfId) continue
          if (seen.has(row.owner_id)) continue
          seen.set(row.owner_id, row.owner_name || 'Someone')
        }
      }
      setSharers(Array.from(seen, ([id, name]) => ({ id, name })))
    })
    return () => { cancelled = true }
  }, [scope, selfId])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: colors.textFaint, fontFamily: fonts.body }}>
        {label}:
      </span>
      <select
        data-testid="owner-selector"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '6px 10px', borderRadius: 8,
          border: `1px solid ${colors.border}`,
          background: colors.surface, color: colors.text,
          fontSize: 13, fontFamily: fonts.body, fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <option value={selfId}>Me</option>
        {sharers.map(({ id, name }) => (
          <option key={id} value={id}>{name}</option>
        ))}
      </select>
      {sharers.length === 0 && (
        <span style={{ fontSize: 11, color: colors.textGhost, fontFamily: fonts.body }}>
          — no one&rsquo;s shared with you yet
        </span>
      )}
    </div>
  )
}
