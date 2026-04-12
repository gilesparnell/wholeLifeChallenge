export const DATA_KEY = 'wlc-data'

export const loadAll = () => {
  try {
    const stored = localStorage.getItem(DATA_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return {}
}

export const saveDay = (date, dayData) => {
  const all = loadAll()
  const updated = { ...all, [date]: dayData }
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(updated))
  } catch {}
  return updated
}

export const clearAll = () => {
  try {
    localStorage.removeItem(DATA_KEY)
  } catch {}
}
