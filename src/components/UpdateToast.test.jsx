import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import UpdateToast from './UpdateToast'

describe('UpdateToast', () => {
  it('renders nothing when visible is false', () => {
    const { container } = render(<UpdateToast visible={false} onRefresh={vi.fn()} />)
    expect(container.textContent).toBe('')
  })

  it('renders an update message when visible is true', () => {
    render(<UpdateToast visible={true} onRefresh={vi.fn()} />)
    expect(screen.getByText(/new version|update/i)).toBeDefined()
  })

  it('renders a refresh button', () => {
    render(<UpdateToast visible={true} onRefresh={vi.fn()} />)
    expect(screen.getByRole('button', { name: /refresh|reload/i })).toBeDefined()
  })

  it('calls onRefresh when the refresh button is clicked', () => {
    const onRefresh = vi.fn()
    render(<UpdateToast visible={true} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByRole('button', { name: /refresh|reload/i }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('uses role="status" so screen readers announce the update', () => {
    render(<UpdateToast visible={true} onRefresh={vi.fn()} />)
    expect(screen.getByRole('status')).toBeDefined()
  })
})
