import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSharedJournal(ownerId) {
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!ownerId || !supabase) {
      setData({})
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('shared_journal_entries')
      .select('owner_id, date, reflect')
      .eq('owner_id', ownerId)
      .then(({ data: rows, error }) => {
        if (cancelled) return
        if (error || !rows) {
          setData({})
          setLoading(false)
          return
        }
        const byDate = {}
        for (const row of rows) {
          const text = row?.reflect?.reflection_text
          if (!text) continue
          byDate[row.date] = { reflect: row.reflect }
        }
        setData(byDate)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [ownerId])

  return { data, loading }
}
