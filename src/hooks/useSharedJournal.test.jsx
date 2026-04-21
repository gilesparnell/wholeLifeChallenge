import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

import { useSharedJournal } from './useSharedJournal'

const viewChain = (rows, error = null) => ({
  select: () => ({
    eq: () => Promise.resolve({ data: rows, error }),
  }),
})

describe('useSharedJournal', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('returns empty data immediately when ownerId is null', () => {
    const { result } = renderHook(() => useSharedJournal(null))
    expect(result.current.data).toEqual({})
    expect(result.current.loading).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns empty data when ownerId is undefined', () => {
    const { result } = renderHook(() => useSharedJournal(undefined))
    expect(result.current.data).toEqual({})
    expect(result.current.loading).toBe(false)
  })

  it('queries shared_journal_entries filtered by owner_id', async () => {
    mockFrom.mockImplementation((view) => {
      if (view === 'shared_journal_entries') {
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
                    reflect: { completed: true, reflection_text: 'Hello' },
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

    const { result } = renderHook(() => useSharedJournal('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data['2026-04-15']).toEqual({
      reflect: { completed: true, reflection_text: 'Hello' },
    })
  })

  it('shapes the return data as a date-keyed map like useData()', async () => {
    mockFrom.mockReturnValue(
      viewChain([
        { owner_id: 'u2', date: '2026-04-15', reflect: { reflection_text: 'A' } },
        { owner_id: 'u2', date: '2026-04-16', reflect: { reflection_text: 'B' } },
      ]),
    )
    const { result } = renderHook(() => useSharedJournal('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(Object.keys(result.current.data).sort()).toEqual(['2026-04-15', '2026-04-16'])
  })

  it('returns empty data on error', async () => {
    mockFrom.mockReturnValue(viewChain(null, { message: 'boom' }))
    const { result } = renderHook(() => useSharedJournal('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({})
  })

  it('skips rows with no reflection text', async () => {
    mockFrom.mockReturnValue(
      viewChain([
        { owner_id: 'u2', date: '2026-04-15', reflect: null },
        { owner_id: 'u2', date: '2026-04-16', reflect: { reflection_text: 'B' } },
      ]),
    )
    const { result } = renderHook(() => useSharedJournal('u2'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data['2026-04-15']).toBeUndefined()
    expect(result.current.data['2026-04-16']).toBeDefined()
  })
})
