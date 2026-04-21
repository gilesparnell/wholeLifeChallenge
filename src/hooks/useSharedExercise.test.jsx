import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

import { useSharedExercise } from './useSharedExercise'

const viewChain = (rows, error = null) => ({
  select: () => ({
    eq: () => Promise.resolve({ data: rows, error }),
  }),
})

describe('useSharedExercise', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('returns empty data immediately when ownerId is null', () => {
    const { result } = renderHook(() => useSharedExercise(null))
    expect(result.current.data).toEqual({})
    expect(result.current.loading).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('queries shared_exercise_entries filtered by owner_id', async () => {
    mockFrom.mockImplementation((view) => {
      if (view === 'shared_exercise_entries') {
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
                    exercise: [{ type: 'Running', durationMin: 30 }],
                    mobilize: [{ type: 'Yoga', durationMin: 15 }],
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

    const { result } = renderHook(() => useSharedExercise('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data['2026-04-15']).toEqual({
      exercise: [{ type: 'Running', durationMin: 30 }],
      mobilize: [{ type: 'Yoga', durationMin: 15 }],
    })
  })

  it('shapes the return data as a date-keyed map', async () => {
    mockFrom.mockReturnValue(
      viewChain([
        { owner_id: 'u2', date: '2026-04-15', exercise: [{ type: 'Running' }], mobilize: [] },
        { owner_id: 'u2', date: '2026-04-16', exercise: [{ type: 'Swimming' }], mobilize: [] },
      ]),
    )
    const { result } = renderHook(() => useSharedExercise('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(Object.keys(result.current.data).sort()).toEqual(['2026-04-15', '2026-04-16'])
  })

  it('returns empty data on error', async () => {
    mockFrom.mockReturnValue(viewChain(null, { message: 'boom' }))
    const { result } = renderHook(() => useSharedExercise('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({})
  })
})
