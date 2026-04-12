import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

vi.mock('../../lib/profiles', () => ({
  listProfiles: vi.fn(),
  listAllowedEmails: vi.fn(),
  addAllowedEmail: vi.fn(),
  removeAllowedEmail: vi.fn(),
  updateProfile: vi.fn(),
  deleteProfile: vi.fn(),
}))

import AdminUsersManager from './AdminUsersManager'
import * as profiles from '../../lib/profiles'

const mockProfiles = [
  { id: 'user-1', email: 'giles@parnellsystems.com', display_name: 'Giles', role: 'admin', status: 'active', last_login_at: '2026-04-12T00:00:00Z', created_at: '2026-04-01T00:00:00Z' },
  { id: 'user-2', email: 'alice@example.com', display_name: 'Alice', role: 'user', status: 'active', last_login_at: '2026-04-10T00:00:00Z', created_at: '2026-04-02T00:00:00Z' },
  { id: 'user-3', email: 'bob@example.com', display_name: 'Bob', role: 'user', status: 'inactive', last_login_at: null, created_at: '2026-04-03T00:00:00Z' },
]

const mockEmails = [
  { id: 'e-1', email: 'giles@parnellsystems.com', added_by: null, created_at: '2026-04-01T00:00:00Z' },
  { id: 'e-2', email: 'carol@example.com', added_by: 'user-1', created_at: '2026-04-11T00:00:00Z' },
]

describe('AdminUsersManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    profiles.listProfiles.mockResolvedValue(mockProfiles)
    profiles.listAllowedEmails.mockResolvedValue(mockEmails)
    profiles.addAllowedEmail.mockResolvedValue({ id: 'new', email: 'new@example.com' })
    profiles.removeAllowedEmail.mockResolvedValue(true)
    profiles.updateProfile.mockResolvedValue({ id: 'user-2', role: 'admin' })
    profiles.deleteProfile.mockResolvedValue(true)
  })

  it('fetches and renders users on mount', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => {
      expect(screen.getByText('Giles')).toBeDefined()
      expect(screen.getByText('Alice')).toBeDefined()
      expect(screen.getByText('Bob')).toBeDefined()
    })
  })

  it('fetches and renders whitelisted emails on mount', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => {
      expect(screen.getByText('carol@example.com')).toBeDefined()
    })
  })

  it('marks the current user with a "You" label', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => {
      expect(screen.getByText(/You/)).toBeDefined()
    })
  })

  it('shows admin badge for admin users', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => {
      const adminBadges = screen.getAllByText('Admin')
      expect(adminBadges.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows inactive status for inactive users', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeDefined()
    })
  })

  it('adds a new email to the whitelist', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => expect(screen.getByText('carol@example.com')).toBeDefined())

    const input = screen.getByPlaceholderText(/email@example\.com/i)
    const addButton = screen.getByRole('button', { name: /add/i })

    await act(async () => {
      fireEvent.change(input, { target: { value: 'new@example.com' } })
      fireEvent.click(addButton)
    })

    expect(profiles.addAllowedEmail).toHaveBeenCalledWith('new@example.com', 'user-1')
  })

  it('removes an email from the whitelist when delete button clicked', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => expect(screen.getByText('carol@example.com')).toBeDefined())

    const removeBtn = screen.getByTestId('remove-email-e-2')
    await act(async () => {
      fireEvent.click(removeBtn)
    })

    expect(profiles.removeAllowedEmail).toHaveBeenCalledWith('e-2')
  })

  it('does not allow deleting the current admin user', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => expect(screen.getByText('Giles')).toBeDefined())

    // Self user should not have a delete button
    expect(screen.queryByTestId('delete-user-user-1')).toBeNull()
    // Other users should
    expect(screen.getByTestId('delete-user-user-2')).toBeDefined()
  })

  it('toggles user status when status badge clicked', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => expect(screen.getByText('Alice')).toBeDefined())

    const statusBtn = screen.getByTestId('status-toggle-user-2')
    await act(async () => {
      fireEvent.click(statusBtn)
    })

    expect(profiles.updateProfile).toHaveBeenCalledWith('user-2', { status: 'inactive' })
  })

  it('updates user role when role dropdown changes', async () => {
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => expect(screen.getByText('Alice')).toBeDefined())

    // Click edit on Alice
    const editBtn = screen.getByTestId('edit-user-user-2')
    await act(async () => {
      fireEvent.click(editBtn)
    })

    const roleSelect = screen.getByTestId('role-select-user-2')
    await act(async () => {
      fireEvent.change(roleSelect, { target: { value: 'admin' } })
    })

    const saveBtn = screen.getByTestId('save-user-user-2')
    await act(async () => {
      fireEvent.click(saveBtn)
    })

    expect(profiles.updateProfile).toHaveBeenCalledWith('user-2', expect.objectContaining({ role: 'admin' }))
  })

  it('shows empty state when no users exist', async () => {
    profiles.listProfiles.mockResolvedValue([])
    profiles.listAllowedEmails.mockResolvedValue([])
    await act(async () => {
      render(<AdminUsersManager currentUserId="user-1" />)
    })
    await waitFor(() => {
      expect(screen.getByText(/No users/i)).toBeDefined()
    })
  })
})
