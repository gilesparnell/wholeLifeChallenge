import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../lib/leaderboard', () => ({
  fetchLeaderboard: vi.fn().mockResolvedValue([]),
  subscribeLeaderboard: () => () => {},
}))

vi.mock('../lib/profiles', () => ({
  setLeaderboardVisibility: vi.fn(),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'test-user', leaderboard_visible: false },
    user: { email: 'test@example.com' },
  }),
}))

import Leaderboard from './Leaderboard'

describe('Leaderboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Leaderboard heading with a Help trigger', async () => {
    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /leaderboard/i })).toBeDefined()
    })
    expect(screen.getByRole('button', { name: /about leaderboard/i })).toBeDefined()
  })

  it('opens the Help sheet explaining visibility rules', async () => {
    render(<Leaderboard />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /about leaderboard/i })).toBeDefined()
    })
    fireEvent.click(screen.getByRole('button', { name: /about leaderboard/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.textContent).toMatch(/only listed if you opt in/i)
    expect(dialog.textContent).toMatch(/never shared/i)
  })
})
