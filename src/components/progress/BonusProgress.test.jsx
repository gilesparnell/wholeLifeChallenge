import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BonusProgress from './BonusProgress'

const fullBonuses = {
  indulgence: { earned: 1, used: 0, available: 1, streak: 2, threshold: 4 },
  restDay: { earned: 0, used: 0, available: 0, streak: 5, threshold: 10 },
  nightOwl: { earned: 0, used: 0, available: 0, streak: 3, threshold: 6 },
  freeDay: { earned: 0, used: 0, available: 0, streak: 8, threshold: 21 },
}

describe('BonusProgress', () => {
  it('renders nothing when bonuses are missing', () => {
    const { container } = render(<BonusProgress bonuses={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a section for every bonus type', () => {
    render(<BonusProgress bonuses={fullBonuses} />)
    expect(screen.getByText(/indulgence/i)).toBeDefined()
    expect(screen.getByText(/rest day/i)).toBeDefined()
    expect(screen.getByText(/night owl/i)).toBeDefined()
    expect(screen.getByText(/free day/i)).toBeDefined()
  })

  it('shows the streak-over-threshold ratio for each bonus', () => {
    render(<BonusProgress bonuses={fullBonuses} />)
    expect(screen.getByText('2/4')).toBeDefined()
    expect(screen.getByText('5/10')).toBeDefined()
    expect(screen.getByText('3/6')).toBeDefined()
    expect(screen.getByText('8/21')).toBeDefined()
  })

  it('surfaces an "available" badge when the user has earned bonuses to spend', () => {
    render(<BonusProgress bonuses={fullBonuses} />)
    expect(screen.getByText(/1 available/i)).toBeDefined()
  })

  it('renders the page heading', () => {
    render(<BonusProgress bonuses={fullBonuses} />)
    expect(screen.getByText(/bonus progress/i)).toBeDefined()
  })
})
