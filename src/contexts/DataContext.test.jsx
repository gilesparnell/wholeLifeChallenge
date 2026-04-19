import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useData, DataProvider } from './DataContext'
import { getToday } from '../lib/dates'

// Mock AuthContext
const mockUser = { id: 'user-123', email: 'test@example.com', user_metadata: { full_name: 'Test' } }
let currentUser = mockUser
let currentProfile = { id: 'user-123', preferences: {} }
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: currentUser, profile: currentProfile }),
}))

// Mock the broadcast sender so we can assert on it
const sendActivityMock = vi.fn()
vi.mock('../lib/activityBroadcaster', () => ({
  sendActivity: (...args) => sendActivityMock(...args),
  teardown: vi.fn(),
  getChannel: vi.fn(),
  ACTIVITY_CHANNEL_NAME: 'activity-celebrations',
  ACTIVITY_BROADCAST_EVENT: 'activity',
}))

// Mock browser notifications so the self-notify path is observable
const showNotificationMock = vi.fn()
const getPermissionMock = vi.fn(() => 'granted')
vi.mock('../lib/browserNotifications', () => ({
  showNotification: (...args) => showNotificationMock(...args),
  getPermission: (...args) => getPermissionMock(...args),
  isNotificationSupported: () => true,
  requestPermission: vi.fn(),
}))

// Mock the supabase client — non-null truthy value is enough for the
// broadcast path; sendActivity is mocked anyway.
vi.mock('../lib/supabase', () => ({
  supabase: { fake: true },
}))

// Mock supabaseStore
const mockFetchAll = vi.fn()
const mockUpsert = vi.fn()
vi.mock('../lib/supabaseStore', () => ({
  fetchAllEntries: (...args) => mockFetchAll(...args),
  upsertEntry: (...args) => mockUpsert(...args),
}))

// Mock dataStore (localStorage)
const mockLoadAll = vi.fn()
const mockSaveDay = vi.fn()
const mockClearAll = vi.fn()
vi.mock('../lib/dataStore', () => ({
  loadAll: (...args) => mockLoadAll(...args),
  saveDay: (...args) => mockSaveDay(...args),
  clearAll: (...args) => mockClearAll(...args),
  DATA_KEY: 'wlc-data',
}))

// Mock analytics so we can assert track() is called on save
const mockTrack = vi.fn()
vi.mock('../lib/analytics', () => ({
  track: (...args) => mockTrack(...args),
  identifyUser: vi.fn(),
  resetUser: vi.fn(),
}))

function wrapper({ children }) {
  return <DataProvider>{children}</DataProvider>
}

describe('DataContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = mockUser
    currentProfile = { id: 'user-123', preferences: {} }
    mockFetchAll.mockResolvedValue({})
    mockUpsert.mockResolvedValue({ success: true })
    mockLoadAll.mockReturnValue({})
    mockSaveDay.mockReturnValue({})
  })

  describe('with authenticated user (Supabase)', () => {
    it('fetches data from Supabase on mount', async () => {
      const supaData = { '2026-04-11': { nutrition: 5 } }
      mockFetchAll.mockResolvedValue(supaData)

      const { result } = renderHook(() => useData(), { wrapper })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(mockFetchAll).toHaveBeenCalledWith('user-123')
      expect(result.current.data).toEqual(supaData)
    })

    it('saveDay upserts to Supabase and updates local state', async () => {
      mockFetchAll.mockResolvedValue({})

      const { result } = renderHook(() => useData(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      const dayData = { nutrition: 4 }
      await act(async () => {
        await result.current.saveDay('2026-04-11', dayData)
      })

      expect(mockUpsert).toHaveBeenCalledWith('user-123', '2026-04-11', dayData)
      expect(result.current.data['2026-04-11']).toEqual(dayData)
    })

    // #19: defensive localStorage backup so a failed Supabase save can't
    // silently lose data on tab close.
    it('saveDay also writes to localStorage as a defensive backup', async () => {
      mockFetchAll.mockResolvedValue({})

      const { result } = renderHook(() => useData(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      const dayData = { nutrition: 4 }
      await act(async () => {
        await result.current.saveDay('2026-04-11', dayData)
      })

      expect(mockSaveDay).toHaveBeenCalledWith('2026-04-11', dayData)
    })

    // #19: optimistic update — local state must reflect the change BEFORE
    // the upsert resolves so the UI never feels laggy.
    it('saveDay updates local state optimistically before upsert resolves', async () => {
      mockFetchAll.mockResolvedValue({})

      // Hold the upsert open so we can inspect intermediate state.
      let resolveUpsert
      mockUpsert.mockReturnValue(new Promise((r) => { resolveUpsert = r }))

      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const dayData = { nutrition: 4 }
      let savePromise
      act(() => {
        savePromise = result.current.saveDay('2026-04-11', dayData)
      })

      // Local state should already reflect the change even though
      // the upsert hasn't resolved yet.
      expect(result.current.data['2026-04-11']).toEqual(dayData)

      await act(async () => {
        resolveUpsert({ success: true })
        await savePromise
      })
    })

    // #19: saveStatus is exposed on the context so the UI indicator can
    // subscribe.
    it('exposes a saveStatus on the context', async () => {
      mockFetchAll.mockResolvedValue({})

      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.saveStatus).toBeDefined()
      expect(result.current.saveStatus.status).toBe('idle')
      expect(result.current.saveStatus.pendingCount).toBe(0)
    })

    // #10 PostHog: emit a checkin_saved event each time saveDay completes
    it('tracks a checkin_saved analytics event when saveDay is called', async () => {
      mockFetchAll.mockResolvedValue({})

      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.saveDay('2026-04-11', { nutrition: 4 })
      })

      expect(mockTrack).toHaveBeenCalledWith('checkin_saved', expect.any(Object))
    })

    it('does not include the date or any habit text in the tracked event (PII guard)', async () => {
      mockFetchAll.mockResolvedValue({})

      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        await result.current.saveDay('2026-04-11', {
          nutrition: 4,
          reflect: { completed: true, reflection_text: 'a private thought' },
        })
      })

      const props = mockTrack.mock.calls[0][1]
      expect(props).not.toHaveProperty('date')
      expect(props).not.toHaveProperty('reflection_text')
      expect(props).not.toHaveProperty('reflect')
    })

    it('saveStatus moves to saving while a save is in flight, then idle on success', async () => {
      mockFetchAll.mockResolvedValue({})

      let resolveUpsert
      mockUpsert.mockReturnValue(new Promise((r) => { resolveUpsert = r }))

      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      let savePromise
      act(() => {
        savePromise = result.current.saveDay('2026-04-11', { nutrition: 5 })
      })

      await waitFor(() => {
        expect(result.current.saveStatus.status).toBe('saving')
      })

      await act(async () => {
        resolveUpsert({ success: true })
        await savePromise
      })

      expect(result.current.saveStatus.status).toBe('idle')
    })

    it('sets loading to true initially', () => {
      mockFetchAll.mockReturnValue(new Promise(() => {})) // never resolves
      const { result } = renderHook(() => useData(), { wrapper })
      expect(result.current.loading).toBe(true)
    })
  })

  describe('with local user (localStorage)', () => {
    beforeEach(() => {
      currentUser = { email: 'local', user_metadata: { full_name: 'Local User' } }
    })

    it('loads data from localStorage', async () => {
      const localData = { '2026-04-11': { nutrition: 3 } }
      mockLoadAll.mockReturnValue(localData)

      const { result } = renderHook(() => useData(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(mockLoadAll).toHaveBeenCalled()
      expect(result.current.data).toEqual(localData)
      expect(mockFetchAll).not.toHaveBeenCalled()
    })

    it('saveDay writes to localStorage and updates state', async () => {
      mockLoadAll.mockReturnValue({})
      const updated = { '2026-04-11': { nutrition: 5 } }
      mockSaveDay.mockReturnValue(updated)

      const { result } = renderHook(() => useData(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => {
        result.current.saveDay('2026-04-11', { nutrition: 5 })
      })

      expect(mockSaveDay).toHaveBeenCalledWith('2026-04-11', { nutrition: 5 })
      expect(result.current.data).toEqual(updated)
    })
  })

  describe('clearAll', () => {
    it('clears local state and calls clearAll on dataStore', async () => {
      currentUser = { email: 'local', user_metadata: { full_name: 'Local User' } }
      mockLoadAll.mockReturnValue({ '2026-04-11': { nutrition: 5 } })

      const { result } = renderHook(() => useData(), { wrapper })

      await waitFor(() => expect(result.current.loading).toBe(false))

      act(() => {
        result.current.clearAll()
      })

      expect(mockClearAll).toHaveBeenCalled()
      expect(result.current.data).toEqual({})
    })
  })

  describe('activity broadcast on save', () => {
    const makeDay = (overrides = {}) => ({
      nutrition: 5,
      exercise: { completed: false, type: '', duration_minutes: null },
      mobilize: { completed: false, type: '', duration_minutes: null },
      sleep: { completed: false, hours: null },
      hydrate: { completed: false, current_ml: 0, target_ml: 2000 },
      wellbeing: { completed: false, activity_text: '' },
      reflect: { completed: false, reflection_text: '' },
      ...overrides,
    })

    it('sends an exercise flip when saving today with completed=true', async () => {
      const today = getToday()
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        exercise: { completed: true, type: 'Running', duration_minutes: 30 },
      })
      await act(async () => {
        await result.current.saveDay(today, day)
      })

      expect(sendActivityMock).toHaveBeenCalledTimes(1)
      const [payload] = sendActivityMock.mock.calls[0]
      expect(payload).toEqual({
        activity: 'exercise',
        exerciseType: 'Running',
        durationMinutes: 30,
      })
    })

    it('sends multiple flips in stable order when several activities complete at once', async () => {
      const today = getToday()
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        exercise: { completed: true, type: 'Cycling', duration_minutes: 45 },
        wellbeing: { completed: true, activity_text: 'yoga' },
        reflect: { completed: true, reflection_text: 'x' },
      })
      await act(async () => {
        await result.current.saveDay(today, day)
      })

      expect(sendActivityMock).toHaveBeenCalledTimes(3)
      const activities = sendActivityMock.mock.calls.map((c) => c[0].activity)
      expect(activities).toEqual(['exercise', 'wellbeing', 'reflect'])
    })

    it('does NOT send when saving a past date (back-dated edit)', async () => {
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        exercise: { completed: true, type: 'Running', duration_minutes: 30 },
      })
      await act(async () => {
        await result.current.saveDay('2020-01-01', day)
      })

      expect(sendActivityMock).not.toHaveBeenCalled()
    })

    it('does NOT send in local mode', async () => {
      currentUser = { email: 'local', user_metadata: { full_name: 'Local User' } }
      const today = getToday()
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        exercise: { completed: true, type: 'Running', duration_minutes: 30 },
      })
      await act(async () => {
        await result.current.saveDay(today, day)
      })

      expect(sendActivityMock).not.toHaveBeenCalled()
    })

    it('does NOT send when the user has opted out', async () => {
      currentProfile = { id: 'user-123', preferences: { notificationsEnabled: false } }
      const today = getToday()
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        exercise: { completed: true, type: 'Running', duration_minutes: 30 },
      })
      await act(async () => {
        await result.current.saveDay(today, day)
      })

      expect(sendActivityMock).not.toHaveBeenCalled()
    })

    it('sends when preferences are the default (no explicit opt-out)', async () => {
      currentProfile = { id: 'user-123', preferences: {} }
      const today = getToday()
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        reflect: { completed: true, reflection_text: 'private' },
      })
      await act(async () => {
        await result.current.saveDay(today, day)
      })

      expect(sendActivityMock).toHaveBeenCalledTimes(1)
      expect(sendActivityMock.mock.calls[0][0]).toEqual({ activity: 'reflect' })
    })

    it('also shows a local notification when notifyOnOwnActivity is true (test mode)', async () => {
      currentProfile = {
        id: 'user-123',
        preferences: { notifyOnOwnActivity: true },
      }
      const today = getToday()
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        exercise: { completed: true, type: 'Running', duration_minutes: 30 },
      })
      await act(async () => {
        await result.current.saveDay(today, day)
      })

      // Broadcast still fires so other users see it …
      expect(sendActivityMock).toHaveBeenCalledTimes(1)
      // … AND the sender sees a local notification
      expect(showNotificationMock).toHaveBeenCalledTimes(1)
      const arg = showNotificationMock.mock.calls[0][0]
      expect(arg.body).toBe('Someone special has just completed 30 min of Running')
      expect(arg.tag).toMatch(/^wlc-activity-exercise-\d{8}$/)
    })

    it('does NOT show a local notification when notifyOnOwnActivity is false', async () => {
      const today = getToday()
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        exercise: { completed: true, type: 'Running', duration_minutes: 30 },
      })
      await act(async () => {
        await result.current.saveDay(today, day)
      })

      expect(sendActivityMock).toHaveBeenCalledTimes(1)
      expect(showNotificationMock).not.toHaveBeenCalled()
    })

    it('does NOT show a local notification when permission is not granted (even if notifyOnOwnActivity is true)', async () => {
      currentProfile = {
        id: 'user-123',
        preferences: { notifyOnOwnActivity: true },
      }
      getPermissionMock.mockReturnValueOnce('denied')
      const today = getToday()
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        reflect: { completed: true, reflection_text: 'x' },
      })
      await act(async () => {
        await result.current.saveDay(today, day)
      })

      expect(showNotificationMock).not.toHaveBeenCalled()
    })

    it('does NOT send when the activity did not flip (already completed)', async () => {
      const today = getToday()
      // Seed existing data so prev == next in the second save
      mockFetchAll.mockResolvedValue({
        [today]: makeDay({
          exercise: { completed: true, type: 'Running', duration_minutes: 30 },
        }),
      })
      const { result } = renderHook(() => useData(), { wrapper })
      await waitFor(() => expect(result.current.loading).toBe(false))

      const day = makeDay({
        exercise: { completed: true, type: 'Running', duration_minutes: 45 },
      })
      await act(async () => {
        await result.current.saveDay(today, day)
      })

      // duration_minutes changed but completed stayed true — no new flip
      expect(sendActivityMock).not.toHaveBeenCalled()
    })
  })

  describe('useData outside provider', () => {
    it('throws if used outside DataProvider', () => {
      expect(() => {
        renderHook(() => useData())
      }).toThrow('useData must be used within a DataProvider')
    })
  })
})
