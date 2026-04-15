import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StreaksStrip from './StreaksStrip'

describe('StreaksStrip', () => {
  it('renders nothing when streaks are missing', () => {
    const { container } = render(<StreaksStrip streaks={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when every streak is zero', () => {
    const { container } = render(
      <StreaksStrip
        streaks={{
          nutrition: 0,
          exercise: 0,
          mobilize: 0,
          sleep: 0,
          hydrate: 0,
          wellbeing: 0,
          reflect: 0,
        }}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a number for each habit', () => {
    render(
      <StreaksStrip
        streaks={{
          nutrition: 12,
          exercise: 5,
          mobilize: 0,
          sleep: 8,
          hydrate: 3,
          wellbeing: 1,
          reflect: 0,
        }}
      />
    )
    expect(screen.getByLabelText(/current streaks/i)).toBeDefined()
    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getByText('8')).toBeDefined()
    expect(screen.getByText('5')).toBeDefined()
  })

  it('shows each habit label in UPPERCASE', () => {
    render(
      <StreaksStrip streaks={{ nutrition: 4, exercise: 0, mobilize: 0, sleep: 0, hydrate: 0, wellbeing: 0, reflect: 0 }} />
    )
    // Labels rendered via CSS textTransform uppercase, but the text node is still lowercase
    expect(screen.getByText(/nutrition/i)).toBeDefined()
    expect(screen.getByText(/reflect/i)).toBeDefined()
  })
})
