import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './AuthContext'
import { fetchAllEntries, upsertEntry, clearAllEntries } from '../lib/supabaseStore'
import { updateProfileStats } from '../lib/profiles'
import { loadAll as localLoadAll, saveDay as localSaveDay, clearAll as localClearAll } from '../lib/dataStore'
import { createSaveQueue } from '../lib/saveQueue'
import { track as trackAnalytics } from '../lib/analytics'
import { detectActivityFlips } from '../lib/activityNotifications'
import { sendActivity } from '../lib/activityBroadcaster'
import { supabase } from '../lib/supabase'
import { getToday } from '../lib/dates'

const DataContext = createContext(null)

const IDLE_STATUS = { status: 'idle', pendingCount: 0, lastError: null }

export function DataProvider({ children }) {
  const { user, profile } = useAuth()
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState(IDLE_STATUS)

  // One queue per provider instance, created lazily on first render.
  // The lazy useState initialiser runs exactly once per provider lifetime,
  // so we don't recreate the queue on every render.
  const [saveQueue] = useState(() => createSaveQueue())

  // Refs track the latest data + profile without forcing saveDay to
  // recompute its identity on every save. Used by the activity-broadcast
  // side-effect below so it can diff prev vs next and read the opt-out
  // preference without pulling both into the useCallback dependency list.
  const dataRef = useRef(data)
  const profileRef = useRef(profile)
  useEffect(() => { dataRef.current = data }, [data])
  useEffect(() => { profileRef.current = profile }, [profile])

  useEffect(() => {
    return saveQueue.subscribe(setSaveStatus)
  }, [saveQueue])

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

  const saveDay = useCallback((date, dayData) => {
    // Capture prev for today's activity-flip diff BEFORE the optimistic
    // update overwrites it.
    const prevDay = dataRef.current[date]

    // Optimistic update first — UI never blocks on the network.
    // Always write through to localStorage as a defensive backup so a
    // failed Supabase upsert can't lose the user's edit on tab close.
    localSaveDay(date, dayData)
    setData((prev) => ({ ...prev, [date]: dayData }))

    // Tally how many habit slots were touched so we have something to
    // analyse without sending the user's content. No date, no text fields.
    const habitCount = dayData && typeof dayData === 'object'
      ? Object.keys(dayData).length
      : 0
    trackAnalytics('checkin_saved', { habit_count: habitCount, mode: isLocal ? 'local' : 'cloud' })

    // Fire-and-forget "Someone special" broadcast for any activity that
    // flipped false→true on today's entry. Gated by: non-local mode,
    // supabase client present, save is for today, and user has not opted
    // out via preferences.notificationsEnabled === false.
    if (
      !isLocal &&
      supabase &&
      user &&
      date === getToday() &&
      profileRef.current?.preferences?.notificationsEnabled !== false
    ) {
      const flips = detectActivityFlips(prevDay, dayData)
      for (const flip of flips) {
        sendActivity(flip, supabase)
      }
    }

    if (isLocal) {
      return Promise.resolve({ success: true })
    }

    return saveQueue.enqueue(() => upsertEntry(user.id, date, dayData))
  }, [isLocal, user, saveQueue])

  const clearAll = useCallback(async () => {
    // Always wipe local cache (harmless if empty)
    localClearAll()
    setData({})

    // For signed-in Supabase users, also delete rows from daily_entries
    // and reset the denormalised profile stats (otherwise the leaderboard
    // would still show stale totals).
    if (!isLocal && user?.id) {
      await clearAllEntries(user.id)
      await updateProfileStats(user.id, {
        totalScore: 0,
        currentStreak: 0,
        daysActive: 0,
        cumulativeByDay: [],
      })
    }
  }, [isLocal, user])

  return (
    <DataContext.Provider value={{ data, loading, saveDay, clearAll, saveStatus }}>
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
