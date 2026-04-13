import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Health = () => {
  const [status, setStatus] = useState('checking')
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const ping = async () => {
      if (!supabase) {
        if (!cancelled) {
          setStatus('DOWN')
          setError('Supabase client not configured')
        }
        return
      }
      try {
        const { error: err } = await supabase.from('profiles').select('id').limit(1)
        if (cancelled) return
        if (err) {
          setStatus('DOWN')
          setError(err.message)
        } else {
          setStatus('OK')
        }
      } catch (e) {
        if (cancelled) return
        setStatus('DOWN')
        setError(e?.message ?? 'unknown error')
      }
    }
    ping()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div
      style={{
        padding: 24,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 14,
      }}
    >
      <p style={{ fontSize: 24, margin: 0 }}>{status}</p>
      {error ? <p style={{ marginTop: 8, opacity: 0.7 }}>{error}</p> : null}
    </div>
  )
}

export default Health
