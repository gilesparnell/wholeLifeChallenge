import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Help from './Help'

describe('Help', () => {
  const renderHelp = (props = {}) =>
    render(
      <Help title="Sleep Quality" {...props}>
        Rate how well you slept last night. 1 = poor, 5 = great.
      </Help>
    )

  it('renders an info trigger button with an accessible label derived from the title', () => {
    renderHelp()
    const trigger = screen.getByRole('button', { name: /about sleep quality/i })
    expect(trigger).toBeDefined()
  })

  it('does not render the sheet content until the trigger is clicked', () => {
    renderHelp()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText(/Rate how well you slept/i)).toBeNull()
  })

  it('opens the sheet with title and content when the trigger is clicked', () => {
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /about sleep quality/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByRole('heading', { name: /sleep quality/i })).toBeDefined()
    expect(screen.getByText(/Rate how well you slept/i)).toBeDefined()
  })

  it('closes the sheet when Escape is pressed', () => {
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /about sleep quality/i }))
    expect(screen.getByRole('dialog')).toBeDefined()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closes the sheet when the backdrop is clicked', () => {
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /about sleep quality/i }))
    fireEvent.click(screen.getByTestId('help-backdrop'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not close when clicking inside the sheet content', () => {
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /about sleep quality/i }))
    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('renders a close button that dismisses the sheet', () => {
    renderHelp()
    fireEvent.click(screen.getByRole('button', { name: /about sleep quality/i }))
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders an optional learn-more link when learnMoreHref is provided', () => {
    render(
      <Help title="Leaderboard" learnMoreHref="/info#leaderboard">
        See how you rank.
      </Help>
    )
    fireEvent.click(screen.getByRole('button', { name: /about leaderboard/i }))
    const link = screen.getByRole('link', { name: /learn more/i })
    expect(link.getAttribute('href')).toBe('/info#leaderboard')
  })

  it('portals the opened sheet to document.body so it cannot inherit text-transform from its parent', () => {
    // Reproduces the Progress-page bug: chart heading had
    // text-transform: uppercase and letter-spacing: 2 which the sheet
    // inherited because it rendered inside that parent.
    render(
      <div data-testid="uppercase-parent" style={{ textTransform: 'uppercase', letterSpacing: '2px' }}>
        <Help title="Daily Score">Your score for each day.</Help>
      </div>
    )
    fireEvent.click(screen.getByRole('button', { name: /about daily score/i }))
    const dialog = screen.getByRole('dialog')
    const parent = screen.getByTestId('uppercase-parent')
    // The dialogue must not be a descendant of the uppercase parent.
    expect(parent.contains(dialog)).toBe(false)
    // Every ancestor of the dialogue up to document.body must be free of
    // the inherited text-transform.
    let node = dialog.parentElement
    while (node && node !== document.body) {
      expect(node.style.textTransform).not.toBe('uppercase')
      node = node.parentElement
    }
  })
})
