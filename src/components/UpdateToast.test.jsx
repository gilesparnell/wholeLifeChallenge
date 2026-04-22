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

  describe('summary', () => {
    it('renders the version header when summary is provided', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{ version: '0.18.0', title: 'Cool thing', items: ['Bullet A'] }}
        />,
      )
      expect(screen.getByText(/v0\.18\.0/i)).toBeDefined()
      expect(screen.getByText(/Cool thing/i)).toBeDefined()
    })

    it('renders each bullet from the summary', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{ version: '0.18.0', title: 'X', items: ['Bullet A', 'Bullet B'] }}
        />,
      )
      expect(screen.getByText('Bullet A')).toBeDefined()
      expect(screen.getByText('Bullet B')).toBeDefined()
    })

    it('renders an ellipsis when hasMore is true', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{ version: '0.18.0', title: 'X', items: ['A', 'B', 'C'], hasMore: true }}
        />,
      )
      expect(screen.getByTestId('update-toast-has-more')).toBeDefined()
    })

    it('does NOT render the ellipsis when hasMore is false', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{ version: '0.18.0', title: 'X', items: ['A'], hasMore: false }}
        />,
      )
      expect(screen.queryByTestId('update-toast-has-more')).toBeNull()
    })

    it('falls back to just "New version available" when summary is null', () => {
      render(<UpdateToast visible={true} onRefresh={vi.fn()} summary={null} />)
      expect(screen.getByText(/new version/i)).toBeDefined()
      expect(screen.queryByRole('list')).toBeNull()
    })

    it('does not render the list when items is empty', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{ version: '0.18.0', title: 'X', items: [] }}
        />,
      )
      // Should still show version header
      expect(screen.getByText(/v0\.18\.0/i)).toBeDefined()
      expect(screen.queryByRole('list')).toBeNull()
    })
  })
})
