import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../contexts/DataContext', () => ({
  useData: vi.fn(),
}))

import { useData } from '../contexts/DataContext'
import SaveStatusIndicator from './SaveStatusIndicator'

describe('SaveStatusIndicator', () => {
  it('renders nothing when status is idle and no error', () => {
    useData.mockReturnValue({
      saveStatus: { status: 'idle', pendingCount: 0, lastError: null },
    })
    const { container } = render(<SaveStatusIndicator />)
    expect(container.textContent).toBe('')
  })

  it('shows "Saving" while a save is in flight', () => {
    useData.mockReturnValue({
      saveStatus: { status: 'saving', pendingCount: 1, lastError: null },
    })
    render(<SaveStatusIndicator />)
    expect(screen.getByText(/saving/i)).toBeDefined()
  })

  it('shows "Retrying" when a save is being retried', () => {
    useData.mockReturnValue({
      saveStatus: { status: 'retrying', pendingCount: 1, lastError: 'transient' },
    })
    render(<SaveStatusIndicator />)
    expect(screen.getByText(/retrying/i)).toBeDefined()
  })

  it('shows "Couldn\'t sync" with the error message when status is error', () => {
    useData.mockReturnValue({
      saveStatus: { status: 'error', pendingCount: 0, lastError: 'network unreachable' },
    })
    render(<SaveStatusIndicator />)
    expect(screen.getByText(/couldn't sync|sync issue|sync failed/i)).toBeDefined()
    expect(screen.getByText(/network unreachable/i)).toBeDefined()
  })

  it('uses role="status" so screen readers announce updates', () => {
    useData.mockReturnValue({
      saveStatus: { status: 'saving', pendingCount: 1, lastError: null },
    })
    render(<SaveStatusIndicator />)
    expect(screen.getByRole('status')).toBeDefined()
  })

  it('handles a missing saveStatus on the context (legacy path) without crashing', () => {
    useData.mockReturnValue({})
    expect(() => render(<SaveStatusIndicator />)).not.toThrow()
  })
})
