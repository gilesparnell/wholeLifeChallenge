import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useData, DataProvider } from './DataContext'

// Mock AuthContext
const mockUser = { id: 'user-123', email: 'test@example.com', user_metadata: { full_name: 'Test' } }
let currentUser = mockUser
vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
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

function wrapper({ children }) {
  return <DataProvider>{children}</DataProvider>
}

describe('DataContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentUser = mockUser
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

  describe('useData outside provider', () => {
    it('throws if used outside DataProvider', () => {
      expect(() => {
        renderHook(() => useData())
      }).toThrow('useData must be used within a DataProvider')
    })
  })
})
