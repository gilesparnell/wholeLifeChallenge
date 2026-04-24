const BONUS_KEYS = ['indulgence', 'restDay', 'nightOwl', 'freeDay']

/**
 * Compares two bonus snapshots and returns the keys of any bonuses whose
 * `earned` count increased. Used to trigger celebration animations.
 *
 * Returns [] when prevBonuses is null (initial load — no celebration on mount).
 */
export function detectNewBonuses(prevBonuses, nextBonuses) {
  if (!prevBonuses || !nextBonuses) return []
  return BONUS_KEYS.filter((key) => {
    const prevEarned = prevBonuses[key]?.earned ?? 0
    const nextEarned = nextBonuses[key]?.earned ?? 0
    return nextEarned > prevEarned
  })
}
