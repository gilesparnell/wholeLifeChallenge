import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CalendarHeatmap from './CalendarHeatmap'
import RadarWeek from './RadarWeek'
import RecoveryStrainScatter from './RecoveryStrainScatter'

describe('CalendarHeatmap', () => {
  it('renders nothing for empty data', () => {
    const { container } = render(<CalendarHeatmap data={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a heading + one svg rect per day', () => {
    const data = Array.from({ length: 14 }, (_, i) => ({
      day: i + 1,
      date: `2026-04-${13 + i}`,
      score: i * 2,
      intensity: (i * 2) / 35,
      future: i > 6,
    }))
    const { container } = render(<CalendarHeatmap data={data} />)
    expect(screen.getByText(/challenge heatmap/i)).toBeDefined()
    const rects = container.querySelectorAll('svg rect')
    expect(rects.length).toBe(14)
  })
})

describe('RadarWeek', () => {
  it('renders nothing when there are no weeks', () => {
    const { container } = render(<RadarWeek data={{}} allDates={[]} totalWeeks={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders week chips and the chart container', () => {
    const allDates = Array.from({ length: 14 }, (_, i) => `2026-04-${13 + i}`)
    const data = {}
    allDates.forEach((d) => {
      data[d] = {
        nutrition: 5,
        exercise: { completed: true },
        mobilize: { completed: true },
        sleep: { completed: true },
        hydrate: { completed: true },
        wellbeing: { completed: true },
      }
    })
    render(<RadarWeek data={data} allDates={allDates} totalWeeks={2} />)
    expect(screen.getByText(/week balance/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /W1/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /W2/i })).toBeDefined()
  })
})

describe('RecoveryStrainScatter', () => {
  it('renders nothing when the trend is empty', () => {
    const { container } = render(<RecoveryStrainScatter trend={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when fewer than 3 days have both recovery and strain', () => {
    const { container } = render(
      <RecoveryStrainScatter
        trend={[
          { day: 1, recovery: 80, strain: 10 },
          { day: 2, recovery: null, strain: 5 },
        ]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the chart when there are enough points', () => {
    render(
      <RecoveryStrainScatter
        trend={[
          { day: 1, recovery: 80, strain: 10 },
          { day: 2, recovery: 75, strain: 12 },
          { day: 3, recovery: 85, strain: 8 },
        ]}
      />
    )
    expect(screen.getByText(/recovery x strain/i)).toBeDefined()
    expect(screen.getByText(/top-right/i)).toBeDefined()
  })
})
