export const DATA_KEY = 'wlc-data'

export const loadAll = () => {
  try {
    const stored = localStorage.getItem(DATA_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // localStorage unavailable or corrupt — treat as empty
  }
  return {}
}

export const saveDay = (date, dayData) => {
  const all = loadAll()
  const updated = { ...all, [date]: dayData }
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(updated))
  } catch {
    // localStorage unavailable — return in-memory copy so UI updates
  }
  return updated
}

export const clearAll = () => {
  try {
    localStorage.removeItem(DATA_KEY)
  } catch {
    // localStorage unavailable — nothing to clear anyway
  }
}
