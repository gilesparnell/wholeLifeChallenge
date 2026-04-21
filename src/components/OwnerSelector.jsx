import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { colors, fonts } from '../styles/theme'

const VIEW_BY_SCOPE = {
  journal: 'shared_journal_entries',
  wellness: 'shared_wellness_entries',
}

export default function OwnerSelector({ scope, selfId, value, onChange, label = 'Viewing' }) {
  const [sharers, setSharers] = useState([])

  useEffect(() => {
    let cancelled = false
    const view = VIEW_BY_SCOPE[scope]
    if (!view || !supabase) return

    supabase
      .from(view)
      .select('owner_id, owner_name')
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const seen = new Map()
        for (const row of data) {
          if (!row || !row.owner_id) continue
          if (row.owner_id === selfId) continue
          if (seen.has(row.owner_id)) continue
          seen.set(row.owner_id, row.owner_name || 'Someone')
        }
        setSharers(Array.from(seen, ([id, name]) => ({ id, name })))
      })
    return () => { cancelled = true }
  }, [scope, selfId])

  // Hide the whole control when there's no one to switch to — keeps the
  // default journal / progress pages clean for users without any shares.
  if (sharers.length === 0 && value === selfId) {
    return (
      <select
        data-testid="owner-selector"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          display: 'none',
        }}
      >
        <option value={selfId}>Me</option>
      </select>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
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
    </div>
  )
}
