import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { email: 'test@example.com', user_metadata: { full_name: 'Test User', avatar_url: '' } },
    signOut: vi.fn(),
  }),
}))

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', resolvedTheme: 'dark', toggleTheme: vi.fn() }),
}))

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({ saveStatus: { status: 'idle', pendingCount: 0, lastError: null } }),
}))

describe('Layout', () => {
  it('renders navigation tabs', () => {
    render(
      <MemoryRouter>
        <Layout><div>Content</div></Layout>
      </MemoryRouter>
    )
    expect(screen.getByText('Check In')).toBeDefined()
    expect(screen.getByText('Progress')).toBeDefined()
    expect(screen.getByText('Journal')).toBeDefined()
    expect(screen.getByText('Info')).toBeDefined()
  })

  it('renders children', () => {
    render(
      <MemoryRouter>
        <Layout><div>Test Content</div></Layout>
      </MemoryRouter>
    )
    expect(screen.getByText('Test Content')).toBeDefined()
  })

  it('renders the challenge header', () => {
    render(
      <MemoryRouter>
        <Layout><div>Content</div></Layout>
      </MemoryRouter>
    )
    expect(screen.getByText('Whole Life Challenge')).toBeDefined()
  })
})
