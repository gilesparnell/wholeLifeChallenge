import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyPreferences from './MyPreferences'

// Mock supabase auth + profiles module so save tests don't hit the network
const updateProfileMock = vi.fn()
vi.mock('../lib/profiles', () => ({
  updateProfile: (...args) => updateProfileMock(...args),
}))

const updateLocalProfileMock = vi.fn()
let mockProfile = null
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mockProfile,
    updateLocalProfile: updateLocalProfileMock,
    session: { access_token: 'fake' },
  }),
}))

const renderPage = () =>
  render(
    <MemoryRouter>
      <MyPreferences />
    </MemoryRouter>
  )

beforeEach(() => {
  updateProfileMock.mockReset()
  updateLocalProfileMock.mockReset()
  mockProfile = {
    id: 'user-barney',
    email: 'barney@example.com',
    display_name: 'Barney',
    role: 'user',
    status: 'active',
    preferences: {},
  }
})

describe('MyPreferences', () => {
  describe('rendering', () => {
    it('renders a page title', () => {
      renderPage()
      expect(screen.getByRole('heading', { name: /my preferences/i })).toBeDefined()
    })

    it('shows a water target input seeded from the global default when the user has no override', () => {
      renderPage()
      const input = screen.getByLabelText(/water target/i)
      // Default from DEFAULT_CONFIG is 2000ml
      expect(Number(input.value)).toBe(2000)
    })

    it('shows a water tap increment input', () => {
      renderPage()
      expect(screen.getByLabelText(/water tap/i)).toBeDefined()
    })

    it('shows a sleep target input', () => {
      renderPage()
      expect(screen.getByLabelText(/sleep target/i)).toBeDefined()
    })

    it('seeds inputs from profile.preferences when the user has overrides', () => {
      mockProfile = {
        ...mockProfile,
        preferences: {
          hydrationTargetMl: 2500,
          hydrationIncrementMl: 500,
          sleepTargetHours: 7,
        },
      }
      renderPage()
      expect(Number(screen.getByLabelText(/water target/i).value)).toBe(2500)
      expect(Number(screen.getByLabelText(/water tap/i).value)).toBe(500)
      expect(Number(screen.getByLabelText(/sleep target/i).value)).toBe(7)
    })
  })

  describe('saving', () => {
    it('calls updateProfile with sanitised preferences when Save is clicked', async () => {
      updateProfileMock.mockResolvedValue({ ...mockProfile, preferences: { hydrationTargetMl: 1800 } })
      renderPage()
      fireEvent.change(screen.getByLabelText(/water target/i), { target: { value: '1800' } })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      await waitFor(() => expect(updateProfileMock).toHaveBeenCalledOnce())
      const [id, patch] = updateProfileMock.mock.calls[0]
      expect(id).toBe('user-barney')
      expect(patch.preferences.hydrationTargetMl).toBe(1800)
    })

    it('optimistically updates the local profile after a successful save', async () => {
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      fireEvent.change(screen.getByLabelText(/water target/i), { target: { value: '1800' } })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      await waitFor(() => expect(updateLocalProfileMock).toHaveBeenCalledOnce())
      const patch = updateLocalProfileMock.mock.calls[0][0]
      expect(patch.preferences.hydrationTargetMl).toBe(1800)
    })

    it('shows a saved confirmation after a successful save', async () => {
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      await waitFor(() => expect(screen.getByText(/saved/i)).toBeDefined())
    })

    it('shows an error message if updateProfile returns null', async () => {
      updateProfileMock.mockResolvedValue(null)
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      await waitFor(() => expect(screen.getByText(/couldn.t save|try again/i)).toBeDefined())
    })

    it('strips out-of-range values before sending to updateProfile', async () => {
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      // 50ml is below the min of 500
      fireEvent.change(screen.getByLabelText(/water target/i), { target: { value: '50' } })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      await waitFor(() => expect(updateProfileMock).toHaveBeenCalledOnce())
      const [, patch] = updateProfileMock.mock.calls[0]
      // The out-of-range value must NOT land in the persisted preferences
      expect(patch.preferences.hydrationTargetMl).toBeUndefined()
    })
  })

  describe('reset to defaults', () => {
    it('clears all overrides when Reset to defaults is clicked', async () => {
      mockProfile = {
        ...mockProfile,
        preferences: { hydrationTargetMl: 2500 },
      }
      updateProfileMock.mockResolvedValue({ ...mockProfile, preferences: {} })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }))
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      await waitFor(() => expect(updateProfileMock).toHaveBeenCalledOnce())
      const [, patch] = updateProfileMock.mock.calls[0]
      expect(patch.preferences).toEqual({})
    })
  })
})
