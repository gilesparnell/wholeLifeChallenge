import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ActivityModal from './ActivityModal'

describe('ActivityModal', () => {
  it('does not render when isOpen is false', () => {
    render(<ActivityModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} title="Test" placeholder="Enter..." />)
    expect(screen.queryByTestId('activity-modal-overlay')).toBeNull()
  })

  it('renders when isOpen is true', () => {
    render(<ActivityModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} title="Well-Being" placeholder="What did you do?" />)
    expect(screen.getByText('Well-Being')).toBeDefined()
    expect(screen.getByTestId('activity-modal-textarea')).toBeDefined()
  })

  it('shows initial text', () => {
    render(<ActivityModal isOpen={true} onClose={vi.fn()} onSave={vi.fn()} title="Test" placeholder="" initialText="My activity" />)
    expect(screen.getByTestId('activity-modal-textarea').value).toBe('My activity')
  })

  it('calls onSave with textarea content when save is clicked', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<ActivityModal isOpen={true} onClose={onClose} onSave={onSave} title="Test" placeholder="" initialText="Hello" />)
    fireEvent.click(screen.getByTestId('activity-modal-save'))
    expect(onSave).toHaveBeenCalledWith('Hello')
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn()
    render(<ActivityModal isOpen={true} onClose={onClose} onSave={vi.fn()} title="Test" placeholder="" />)
    fireEvent.click(screen.getByTestId('activity-modal-overlay'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn()
    render(<ActivityModal isOpen={true} onClose={onClose} onSave={vi.fn()} title="Test" placeholder="" />)
    fireEvent.click(screen.getByText('\u2715'))
    expect(onClose).toHaveBeenCalled()
  })
})
