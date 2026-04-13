import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}))

import Health from './Health'

const renderPage = () =>
  render(
    <MemoryRouter>
      <Health />
    </MemoryRouter>
  )

describe('Health page', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('shows OK when the supabase ping succeeds', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/^OK$/)).toBeInTheDocument()
    })
  })

  it('shows DOWN with the error message when the supabase ping fails', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: null, error: { message: 'db unreachable' } }),
      }),
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/DOWN/)).toBeInTheDocument()
      expect(screen.getByText(/db unreachable/)).toBeInTheDocument()
    })
  })

  it('shows DOWN when supabase client is null (missing env)', async () => {
    vi.doMock('../lib/supabase', () => ({ supabase: null }))

    // Use a fresh isolated import so the mock takes effect
    const { default: HealthIsolated } = await import('./Health?t=' + Date.now())
    render(
      <MemoryRouter>
        <HealthIsolated />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/DOWN/)).toBeInTheDocument()
    })
  })
})
