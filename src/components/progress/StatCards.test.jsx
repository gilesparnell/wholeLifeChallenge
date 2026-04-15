import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCards from './StatCards'

const fullStats = {
  totalScore: 210,
  consistency: 86,
  bestDay: { dayNumber: 3, date: '2026-04-15', score: 35 },
  bestWeek: { weekNumber: 1, total: 245 },
  longestHabitStreak: { habit: 'hydrate', days: 12 },
  maxPossible: 245,
}

describe('StatCards', () => {
  it('renders nothing when stats are missing', () => {
    const { container } = render(<StatCards stats={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the total score value', () => {
    render(<StatCards stats={fullStats} />)
    expect(screen.getByText('210')).toBeDefined()
  })

  it('renders best day with day number footnote', () => {
    render(<StatCards stats={fullStats} />)
    expect(screen.getByText('35')).toBeDefined()
    expect(screen.getByText(/day 3/i)).toBeDefined()
  })

  it('renders best week with week number footnote', () => {
    render(<StatCards stats={fullStats} />)
    expect(screen.getByText('245')).toBeDefined()
    expect(screen.getByText(/week 1/i)).toBeDefined()
  })

  it('renders consistency percentage', () => {
    render(<StatCards stats={fullStats} />)
    expect(screen.getByText('86%')).toBeDefined()
  })

  it('renders longest habit streak with human-friendly label', () => {
    render(<StatCards stats={fullStats} />)
    expect(screen.getByText('12')).toBeDefined()
    expect(screen.getByText(/hydrate/i)).toBeDefined()
  })

  it('shows em dashes when there is no best-day / best-week data', () => {
    render(
      <StatCards
        stats={{
          totalScore: 0,
          consistency: 0,
          bestDay: null,
          bestWeek: null,
          longestHabitStreak: { habit: null, days: 0 },
          maxPossible: 0,
        }}
      />
    )
    // At least one em dash for best-day and best-week
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })
})
