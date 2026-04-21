import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

import { useSharedWellness } from './useSharedWellness'

const viewChain = (rows, error = null) => ({
  select: () => ({
    eq: () => Promise.resolve({ data: rows, error }),
  }),
})

describe('useSharedWellness', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('returns empty data immediately when ownerId is null', () => {
    const { result } = renderHook(() => useSharedWellness(null))
    expect(result.current.data).toEqual({})
    expect(result.current.loading).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('queries shared_wellness_entries filtered by owner_id', async () => {
    mockFrom.mockImplementation((view) => {
      if (view === 'shared_wellness_entries') {
        return {
          select: () => ({
            eq: (col, val) => {
              expect(col).toBe('owner_id')
              expect(val).toBe('u2')
              return Promise.resolve({
                data: [
                  {
                    owner_id: 'u2',
                    date: '2026-04-15',
                    sleep: { completed: true, hours: 7.5 },
                    wellbeing: { score: 4 },
                    selfReport: { mood: 4 },
                  },
                ],
                error: null,
              })
            },
          }),
        }
      }
      return viewChain([])
    })

    const { result } = renderHook(() => useSharedWellness('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data['2026-04-15']).toEqual({
      sleep: { completed: true, hours: 7.5 },
      wellbeing: { score: 4 },
      selfReport: { mood: 4 },
    })
  })

  it('shapes the return data as a date-keyed map', async () => {
    mockFrom.mockReturnValue(
      viewChain([
        { owner_id: 'u2', date: '2026-04-15', sleep: { hours: 7 } },
        { owner_id: 'u2', date: '2026-04-16', sleep: { hours: 8 } },
      ]),
    )
    const { result } = renderHook(() => useSharedWellness('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(Object.keys(result.current.data).sort()).toEqual(['2026-04-15', '2026-04-16'])
  })

  it('returns empty data on error', async () => {
    mockFrom.mockReturnValue(viewChain(null, { message: 'boom' }))
    const { result } = renderHook(() => useSharedWellness('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({})
  })
})
