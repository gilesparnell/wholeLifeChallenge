import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyPreferences from './MyPreferences'

// Mock supabase auth + profiles module so save tests don't hit the network
const updateProfileMock = vi.fn()
vi.mock('../lib/profiles', () => ({
  updateProfile: (...args) => updateProfileMock(...args),
}))

const requestPermissionMock = vi.fn()
const getPermissionMock = vi.fn()
const showNotificationMock = vi.fn()
vi.mock('../lib/browserNotifications', () => ({
  isNotificationSupported: () => true,
  getPermission: (...args) => getPermissionMock(...args),
  requestPermission: (...args) => requestPermissionMock(...args),
  showNotification: (...args) => showNotificationMock(...args),
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
  requestPermissionMock.mockReset()
  getPermissionMock.mockReset()
  showNotificationMock.mockReset()
  showNotificationMock.mockResolvedValue(true)
  getPermissionMock.mockReturnValue('granted')
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

  describe('notifications toggle', () => {
    it('renders the notifications toggle as ON by default (opt-out)', () => {
      renderPage()
      const toggle = screen.getByRole('checkbox', { name: /notifications/i })
      expect(toggle.checked).toBe(true)
    })

    it('renders the toggle as OFF when the profile has opted out', () => {
      mockProfile = {
        ...mockProfile,
        preferences: { notificationsEnabled: false },
      }
      renderPage()
      const toggle = screen.getByRole('checkbox', { name: /notifications/i })
      expect(toggle.checked).toBe(false)
    })

    it('persists { notificationsEnabled: false } immediately when toggled off', async () => {
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      fireEvent.click(screen.getByRole('checkbox', { name: /notifications/i }))
      await waitFor(() => expect(updateProfileMock).toHaveBeenCalledOnce())
      const [id, patch] = updateProfileMock.mock.calls[0]
      expect(id).toBe('user-barney')
      expect(patch.preferences.notificationsEnabled).toBe(false)
    })

    it('persists { notificationsEnabled: true } and requests permission when toggling back on with default permission', async () => {
      mockProfile = {
        ...mockProfile,
        preferences: { notificationsEnabled: false },
      }
      getPermissionMock.mockReturnValue('default')
      requestPermissionMock.mockResolvedValue('granted')
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      fireEvent.click(screen.getByRole('checkbox', { name: /notifications/i }))
      await waitFor(() => expect(updateProfileMock).toHaveBeenCalledOnce())
      const [, patch] = updateProfileMock.mock.calls[0]
      // diff only persists values that differ from the global default,
      // and the default is true, so toggling "back on" to match the
      // default should result in an empty preferences object.
      expect(patch.preferences.notificationsEnabled).toBeUndefined()
      expect(requestPermissionMock).toHaveBeenCalledOnce()
    })

    it('does not call requestPermission when toggling off', async () => {
      getPermissionMock.mockReturnValue('default')
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      fireEvent.click(screen.getByRole('checkbox', { name: /notifications/i }))
      await waitFor(() => expect(updateProfileMock).toHaveBeenCalledOnce())
      expect(requestPermissionMock).not.toHaveBeenCalled()
    })

    it('shows a Grant browser permission button when the preference is on but permission is default', () => {
      getPermissionMock.mockReturnValue('default')
      renderPage()
      expect(
        screen.getByRole('button', { name: /grant browser permission/i }),
      ).toBeDefined()
    })

    it('hides the Grant button once permission is granted', () => {
      getPermissionMock.mockReturnValue('granted')
      renderPage()
      expect(
        screen.queryByRole('button', { name: /grant browser permission/i }),
      ).toBeNull()
    })

    it('calls requestPermission when the Grant button is clicked', async () => {
      getPermissionMock.mockReturnValue('default')
      requestPermissionMock.mockResolvedValue('granted')
      renderPage()
      fireEvent.click(
        screen.getByRole('button', { name: /grant browser permission/i }),
      )
      await waitFor(() => expect(requestPermissionMock).toHaveBeenCalledOnce())
    })

    it('shows a denied helper when permission is denied', () => {
      getPermissionMock.mockReturnValue('denied')
      renderPage()
      expect(screen.getByText(/browser.+blocked|enable.+browser settings/i)).toBeDefined()
    })
  })

  describe('self-notify test mode toggle', () => {
    it('renders the self-notify toggle as OFF by default', () => {
      renderPage()
      const toggle = screen.getByRole('checkbox', { name: /notify me of my own/i })
      expect(toggle.checked).toBe(false)
    })

    it('renders the toggle as ON when the profile opted in', () => {
      mockProfile = {
        ...mockProfile,
        preferences: { notifyOnOwnActivity: true },
      }
      renderPage()
      const toggle = screen.getByRole('checkbox', { name: /notify me of my own/i })
      expect(toggle.checked).toBe(true)
    })

    it('persists { notifyOnOwnActivity: true } immediately when toggled on', async () => {
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      fireEvent.click(screen.getByRole('checkbox', { name: /notify me of my own/i }))
      await waitFor(() => expect(updateProfileMock).toHaveBeenCalledOnce())
      const [id, patch] = updateProfileMock.mock.calls[0]
      expect(id).toBe('user-barney')
      expect(patch.preferences.notifyOnOwnActivity).toBe(true)
    })

    it('persists the opt-out when toggled back off', async () => {
      mockProfile = {
        ...mockProfile,
        preferences: { notifyOnOwnActivity: true },
      }
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      fireEvent.click(screen.getByRole('checkbox', { name: /notify me of my own/i }))
      await waitFor(() => expect(updateProfileMock).toHaveBeenCalledOnce())
      const [, patch] = updateProfileMock.mock.calls[0]
      // false matches the global default, so diff drops the key entirely
      expect(patch.preferences.notifyOnOwnActivity).toBeUndefined()
    })

    it('requests browser permission when toggled ON and permission is default', async () => {
      getPermissionMock.mockReturnValue('default')
      requestPermissionMock.mockResolvedValue('granted')
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      fireEvent.click(screen.getByRole('checkbox', { name: /notify me of my own/i }))
      await waitFor(() => expect(requestPermissionMock).toHaveBeenCalledOnce())
    })

    it('does NOT request permission when toggled OFF', async () => {
      mockProfile = {
        ...mockProfile,
        preferences: { notifyOnOwnActivity: true },
      }
      getPermissionMock.mockReturnValue('default')
      updateProfileMock.mockResolvedValue({ ...mockProfile })
      renderPage()
      fireEvent.click(screen.getByRole('checkbox', { name: /notify me of my own/i }))
      await waitFor(() => expect(updateProfileMock).toHaveBeenCalledOnce())
      expect(requestPermissionMock).not.toHaveBeenCalled()
    })
  })

  describe('test notification button', () => {
    it('is visible when notifications are on and permission is granted', () => {
      getPermissionMock.mockReturnValue('granted')
      renderPage()
      expect(
        screen.getByRole('button', { name: /send test notification/i }),
      ).toBeDefined()
    })

    it('is hidden when permission is default (Grant button shows instead)', () => {
      getPermissionMock.mockReturnValue('default')
      renderPage()
      expect(
        screen.queryByRole('button', { name: /send test notification/i }),
      ).toBeNull()
    })

    it('is hidden when permission is denied', () => {
      getPermissionMock.mockReturnValue('denied')
      renderPage()
      expect(
        screen.queryByRole('button', { name: /send test notification/i }),
      ).toBeNull()
    })

    it('calls showNotification with a test payload when clicked', async () => {
      getPermissionMock.mockReturnValue('granted')
      renderPage()
      fireEvent.click(
        screen.getByRole('button', { name: /send test notification/i }),
      )
      await waitFor(() => expect(showNotificationMock).toHaveBeenCalledOnce())
      const arg = showNotificationMock.mock.calls[0][0]
      expect(arg.title).toBeTypeOf('string')
      expect(arg.body).toMatch(/test|check|working/i)
    })

    it('shows a confirmation after the test notification is sent successfully', async () => {
      getPermissionMock.mockReturnValue('granted')
      showNotificationMock.mockResolvedValue(true)
      renderPage()
      fireEvent.click(
        screen.getByRole('button', { name: /send test notification/i }),
      )
      await waitFor(() =>
        expect(screen.getByText(/sent|check.+device|look at your/i)).toBeDefined(),
      )
    })

    it('shows a failure hint when showNotification resolves false', async () => {
      getPermissionMock.mockReturnValue('granted')
      showNotificationMock.mockResolvedValue(false)
      renderPage()
      fireEvent.click(
        screen.getByRole('button', { name: /send test notification/i }),
      )
      await waitFor(() =>
        expect(screen.getByText(/couldn.t send|blocked|failed/i)).toBeDefined(),
      )
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
