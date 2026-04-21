import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSharedWellness(ownerId) {
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
      .from('shared_wellness_entries')
      .select('owner_id, date, sleep, wellbeing, selfReport')
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
          if (!row?.date) continue
          byDate[row.date] = {
            sleep: row.sleep ?? undefined,
            wellbeing: row.wellbeing ?? undefined,
            selfReport: row.selfReport ?? undefined,
          }
        }
        setData(byDate)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [ownerId])

  return { data, loading }
}
