import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { fetchAllEntries, upsertEntry } from '../lib/supabaseStore'
import { loadAll as localLoadAll, saveDay as localSaveDay, clearAll as localClearAll } from '../lib/dataStore'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)

  const isLocal = !user?.id || user?.email === 'local'

  useEffect(() => {
    if (!user) return

    if (isLocal) {
      setData(localLoadAll())
      setLoading(false)
    } else {
      fetchAllEntries(user.id)
        .then((entries) => {
          setData(entries)
        })
        .catch((err) => {
          console.error('Failed to fetch entries:', err)
          setData({})
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [user, isLocal])

  const saveDay = useCallback(async (date, dayData) => {
    if (isLocal) {
      const updated = localSaveDay(date, dayData)
      setData(updated)
    } else {
      await upsertEntry(user.id, date, dayData)
      setData((prev) => ({ ...prev, [date]: dayData }))
    }
  }, [isLocal, user])

  const clearAll = useCallback(() => {
    localClearAll()
    setData({})
  }, [])

  return (
    <DataContext.Provider value={{ data, loading, saveDay, clearAll }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
