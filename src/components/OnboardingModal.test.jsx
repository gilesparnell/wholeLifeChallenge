import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import OnboardingModal from './OnboardingModal'

describe('OnboardingModal', () => {
  let onComplete

  beforeEach(() => {
    onComplete = vi.fn()
  })

  it('renders the welcome slide first', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    expect(screen.getByText(/Welcome/i)).toBeDefined()
  })

  it('shows step indicator (e.g. 1 of 4)', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    expect(screen.getByText(/1 of 4/i)).toBeDefined()
  })

  it('advances to the next slide when Next is clicked', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/2 of 4/i)).toBeDefined()
  })

  it('goes back when Back is clicked', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/3 of 4/i)).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText(/2 of 4/i)).toBeDefined()
  })

  it('does not show Back button on the first slide', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull()
  })

  it('shows a Skip button on intermediate slides', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    expect(screen.getByRole('button', { name: /skip/i })).toBeDefined()
  })

  it('calls onComplete when Skip is clicked', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /skip/i }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('shows Get Started button on the last slide', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByRole('button', { name: /get started/i })).toBeDefined()
  })

  it('hides Skip on the last slide', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.queryByRole('button', { name: /skip/i })).toBeNull()
  })

  it('calls onComplete when Get Started is clicked', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /get started/i }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('shows scoring information on slide 2', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/35/)).toBeDefined()
  })

  it('shows bonus information on slide 3', () => {
    render(<OnboardingModal onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/Indulgence/i)).toBeDefined()
  })
})
