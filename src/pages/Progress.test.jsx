import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Heavy leaderboard + realtime network path — stub cleanly.
vi.mock('../lib/leaderboard', () => ({
  fetchLeaderboard: () => Promise.resolve([]),
  subscribeLeaderboard: () => () => {},
}))

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({ data: {}, loading: false }),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-barney' }, profile: { id: 'user-barney', preferences: {} } }),
}))

const mockSharedWellness = vi.fn(() => ({ data: {}, loading: false }))
vi.mock('../hooks/useSharedWellness', () => ({
  useSharedWellness: (...args) => mockSharedWellness(...args),
}))

const mockFrom = vi.fn(() => ({
  select: () => Promise.resolve({ data: [], error: null }),
}))
vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

import Progress from './Progress'

describe('Progress page', () => {
  beforeEach(() => {
    mockSharedWellness.mockReset()
    mockSharedWellness.mockReturnValue({ data: {}, loading: false })
    mockFrom.mockReset()
    mockFrom.mockImplementation(() => ({
      select: () =>
        Promise.resolve({
          data: [{ owner_id: 'u-alice', owner_name: 'Alice' }],
          error: null,
        }),
    }))
  })

  it('renders without crashing and mounts the wellness OwnerSelector', async () => {
    render(<Progress />)
    expect(screen.getByRole('heading', { name: /your journey/i })).toBeDefined()
    expect(screen.getByTestId('owner-selector')).toBeDefined()
  })

  it('calls useSharedWellness with null while viewing self', () => {
    render(<Progress />)
    expect(mockSharedWellness).toHaveBeenCalledWith(null)
  })

  it('swaps to a compact "Wellness Insights" view when another owner is selected', async () => {
    render(<Progress />)
    await waitFor(() =>
      expect(screen.getByTestId('owner-selector').querySelectorAll('option').length).toBeGreaterThan(1),
    )
    fireEvent.change(screen.getByTestId('owner-selector'), { target: { value: 'u-alice' } })
    expect(screen.getByRole('heading', { name: /wellness insights/i })).toBeDefined()
    expect(screen.queryByRole('heading', { name: /your journey/i })).toBeNull()
    expect(mockSharedWellness).toHaveBeenLastCalledWith('u-alice')
  })

  it('shows the "not shared yet" empty state when the sharer has no wellness data', async () => {
    mockSharedWellness.mockReturnValue({ data: {}, loading: false })
    render(<Progress />)
    await waitFor(() =>
      expect(screen.getByTestId('owner-selector').querySelectorAll('option').length).toBeGreaterThan(1),
    )
    fireEvent.change(screen.getByTestId('owner-selector'), { target: { value: 'u-alice' } })
    expect(screen.getByTestId('shared-wellness-empty')).toBeDefined()
  })

  it('includes the privacy reassurance when showing a sharer\'s wellness', async () => {
    // Seed with enough data points so the charts render.
    const sharedData = {}
    for (let i = 0; i < 10; i++) {
      const date = `2026-04-${String(13 + i).padStart(2, '0')}`
      sharedData[date] = {
        sleep: { completed: true, hours: 7 },
        selfReport: { mood: 4, energyLevel: 4 },
      }
    }
    mockSharedWellness.mockReturnValue({ data: sharedData, loading: false })
    render(<Progress />)
    await waitFor(() =>
      expect(screen.getByTestId('owner-selector').querySelectorAll('option').length).toBeGreaterThan(1),
    )
    fireEvent.change(screen.getByTestId('owner-selector'), { target: { value: 'u-alice' } })
    expect(screen.getByText(/nutrition, exercise, and hydration stay private/i)).toBeDefined()
  })
})
