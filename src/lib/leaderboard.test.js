import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeLeaderboard, fetchLeaderboard } from './leaderboard'

const mockFrom = vi.fn()
vi.mock('./supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}))

const chainable = (resolveWith) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (cb) => Promise.resolve(resolveWith).then(cb),
  }
  return chain
}

describe('fetchLeaderboard', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('queries the leaderboard view', async () => {
    const chain = chainable({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await fetchLeaderboard()
    expect(mockFrom).toHaveBeenCalledWith('leaderboard')
  })

  it('orders by total_score descending', async () => {
    const chain = chainable({ data: [], error: null })
    mockFrom.mockReturnValue(chain)
    await fetchLeaderboard()
    expect(chain.order).toHaveBeenCalledWith('total_score', { ascending: false })
  })

  it('returns rows with rank added based on order', async () => {
    const rows = [
      { id: 'a', display_name: 'Alice', total_score: 100, current_streak: 3, days_active: 5 },
      { id: 'b', display_name: 'Bob', total_score: 80, current_streak: 2, days_active: 4 },
    ]
    mockFrom.mockReturnValue(chainable({ data: rows, error: null }))
    const result = await fetchLeaderboard()
    expect(result).toHaveLength(2)
    expect(result[0].rank).toBe(1)
    expect(result[1].rank).toBe(2)
    expect(result[0].display_name).toBe('Alice')
  })

  it('returns empty array when query fails', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: 'denied' } }))
    const result = await fetchLeaderboard()
    expect(result).toEqual([])
  })

  it('returns empty array when data is null', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: null }))
    const result = await fetchLeaderboard()
    expect(result).toEqual([])
  })
})

describe('computeLeaderboard', () => {
  const allDates = ['2026-04-11', '2026-04-12', '2026-04-13']

  it('ranks users by total score descending', () => {
    const usersData = [
      { display_name: 'Alice', data: { '2026-04-11': { nutrition: 5, exercise: { completed: true }, mobilize: { completed: true }, sleep: { completed: true }, hydrate: { completed: true }, wellbeing: { completed: true }, reflect: { completed: true } } } },
      { display_name: 'Bob', data: { '2026-04-11': { nutrition: 3, exercise: { completed: false }, mobilize: { completed: false }, sleep: { completed: false }, hydrate: { completed: false }, wellbeing: { completed: false }, reflect: { completed: false } } } },
    ]
    const board = computeLeaderboard(usersData, allDates, 2)
    expect(board[0].display_name).toBe('Alice')
    expect(board[0].totalScore).toBe(35)
    expect(board[1].display_name).toBe('Bob')
    expect(board[1].totalScore).toBe(3)
  })

  it('returns empty array for empty input', () => {
    expect(computeLeaderboard([], allDates, 0)).toEqual([])
  })

  it('calculates streak correctly', () => {
    const usersData = [
      {
        display_name: 'Charlie',
        data: {
          '2026-04-11': { nutrition: 5, exercise: { completed: true }, mobilize: { completed: true }, sleep: { completed: true }, hydrate: { completed: true }, wellbeing: { completed: true }, reflect: { completed: true } },
          '2026-04-12': { nutrition: 5, exercise: { completed: true }, mobilize: { completed: true }, sleep: { completed: true }, hydrate: { completed: true }, wellbeing: { completed: true }, reflect: { completed: true } },
        },
      },
    ]
    const board = computeLeaderboard(usersData, allDates, 1)
    expect(board[0].streak).toBe(2)
  })

  it('handles users with no data', () => {
    const usersData = [{ display_name: 'Ghost', data: {} }]
    const board = computeLeaderboard(usersData, allDates, 0)
    expect(board[0].totalScore).toBe(0)
    expect(board[0].streak).toBe(0)
  })

  it('includes rank field starting from 1', () => {
    const usersData = [
      { display_name: 'A', data: { '2026-04-11': { nutrition: 5 } } },
      { display_name: 'B', data: { '2026-04-11': { nutrition: 3 } } },
      { display_name: 'C', data: { '2026-04-11': { nutrition: 1 } } },
    ]
    const board = computeLeaderboard(usersData, allDates, 0)
    expect(board[0].rank).toBe(1)
    expect(board[1].rank).toBe(2)
    expect(board[2].rank).toBe(3)
  })

  it('computes daysActive count', () => {
    const usersData = [{
      display_name: 'Dana',
      data: {
        '2026-04-11': { nutrition: 5 },
        '2026-04-12': { nutrition: 4 },
      },
    }]
    const board = computeLeaderboard(usersData, allDates, 2)
    expect(board[0].daysActive).toBe(2)
  })
})
