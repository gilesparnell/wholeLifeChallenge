import { useState, useEffect, useRef, useCallback } from 'react'
import { detectNewBonuses } from '../lib/bonusCelebration'

/**
 * Detects when bonus.earned increases and queues celebration overlays.
 *
 * The loading guard is critical: on mount, data is empty so bonuses.earned = 0.
 * When Supabase loads, earned becomes > 0 for historically-earned bonuses.
 * Without the guard we'd incorrectly treat those as newly-earned and show
 * celebrations on every login.
 */
export function useBonusCelebration(bonuses, loading) {
  const prevBonusesRef = useRef(null)
  const [celebrationQueue, setCelebrationQueue] = useState([])
  const currentCelebration = celebrationQueue[0] ?? null
  const dismissCelebration = useCallback(() => setCelebrationQueue((q) => q.slice(1)), [])

  const bonusEarnedKey = `${bonuses?.indulgence?.earned ?? 0},${bonuses?.restDay?.earned ?? 0},${bonuses?.nightOwl?.earned ?? 0},${bonuses?.freeDay?.earned ?? 0}`

  useEffect(() => {
    if (loading) return // skip while Supabase data is still arriving
    const prev = prevBonusesRef.current
    if (prev !== null) {
      const newlyEarned = detectNewBonuses(prev, bonuses)
      if (newlyEarned.length > 0) {
        setCelebrationQueue((q) => [...q, ...newlyEarned])
      }
    }
    prevBonusesRef.current = bonuses
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bonusEarnedKey, loading])

  return { currentCelebration, dismissCelebration }
}
