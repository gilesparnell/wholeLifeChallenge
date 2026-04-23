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
    it('renders the version number when summary is provided', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{ version: '0.18.0', title: 'Cool thing', items: ['Bullet A'] }}
        />,
      )
      expect(screen.getByText(/v0\.18\.0/i)).toBeDefined()
    })

    it('renders the release title as the one-line summary', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{ version: '0.18.0', title: 'Shareable changelog links', items: [] }}
        />,
      )
      expect(screen.getByText(/Shareable changelog links/i)).toBeDefined()
    })

    it('NEVER renders the bullet list — details live on the changelog page only', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{
            version: '0.18.0',
            title: 'X',
            items: ['Bullet A', 'Bullet B', 'Bullet C'],
            hasMore: true,
          }}
        />,
      )
      expect(screen.queryByText('Bullet A')).toBeNull()
      expect(screen.queryByText('Bullet B')).toBeNull()
      expect(screen.queryByRole('list')).toBeNull()
      expect(screen.queryByTestId('update-toast-has-more')).toBeNull()
    })

    it('renders a "See what\'s new" link pointing at /changelog#<version>', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{ version: '0.18.0', title: 'X', items: [] }}
        />,
      )
      const link = screen.getByTestId('update-toast-see-whats-new')
      expect(link.getAttribute('href')).toBe('/changelog#0.18.0')
      expect(link.textContent).toMatch(/see what['’]?s new/i)
    })

    it('falls back to just "New version available" when summary is null', () => {
      render(<UpdateToast visible={true} onRefresh={vi.fn()} summary={null} />)
      expect(screen.getByText(/new version/i)).toBeDefined()
      expect(screen.queryByTestId('update-toast-see-whats-new')).toBeNull()
    })

    it('still renders version header and link when items is empty', () => {
      render(
        <UpdateToast
          visible={true}
          onRefresh={vi.fn()}
          summary={{ version: '0.18.0', title: 'X', items: [] }}
        />,
      )
      expect(screen.getByText(/v0\.18\.0/i)).toBeDefined()
      expect(screen.getByTestId('update-toast-see-whats-new')).toBeDefined()
    })
  })
})
