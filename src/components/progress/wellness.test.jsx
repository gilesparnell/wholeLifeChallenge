import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SleepHoursChart from './SleepHoursChart'
import WellnessSparklines from './WellnessSparklines'
import HydrationProgressChart from './HydrationProgressChart'

describe('SleepHoursChart', () => {
  it('renders nothing for empty trend', () => {
    const { container } = render(<SleepHoursChart trend={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing with fewer than 3 points', () => {
    const { container } = render(
      <SleepHoursChart
        trend={[
          { day: 1, date: '2026-04-13', value: 7 },
          { day: 2, date: '2026-04-14', value: 8 },
        ]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders heading and target band footnote with enough data', () => {
    render(
      <SleepHoursChart
        targetHours={8}
        trend={[
          { day: 1, date: '2026-04-13', value: 7 },
          { day: 2, date: '2026-04-14', value: 8 },
          { day: 3, date: '2026-04-15', value: 7.5 },
        ]}
      />
    )
    expect(screen.getByText(/sleep hours/i)).toBeDefined()
    expect(screen.getByText(/7.*9.*h/i)).toBeDefined()
  })
})

describe('WellnessSparklines', () => {
  it('renders nothing when there is no wellness data', () => {
    const { container } = render(<WellnessSparklines trends={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when every field has fewer than 2 points', () => {
    const { container } = render(
      <WellnessSparklines
        trends={{
          mood: [{ day: 1, date: 'd', value: 3 }],
          energyLevel: [],
          stressLevel: [],
          soreness: [],
          sleepHours: [],
        }}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders sparkline cards for fields with enough data', () => {
    const series = [
      { day: 1, date: '2026-04-13', value: 3 },
      { day: 2, date: '2026-04-14', value: 4 },
      { day: 3, date: '2026-04-15', value: 5 },
    ]
    render(
      <WellnessSparklines
        trends={{
          mood: series,
          energyLevel: series,
          stressLevel: series,
          soreness: series,
          sleepHours: series,
        }}
      />
    )
    expect(screen.getByText(/wellness signals/i)).toBeDefined()
    expect(screen.getByText(/mood/i)).toBeDefined()
    expect(screen.getByText(/energy/i)).toBeDefined()
    expect(screen.getByText(/stress/i)).toBeDefined()
    expect(screen.getByText(/soreness/i)).toBeDefined()
  })
})

describe('HydrationProgressChart', () => {
  it('renders nothing with fewer than 3 days of data', () => {
    const { container } = render(
      <HydrationProgressChart
        effectiveTargetMl={2000}
        data={[{ day: 1, ml: 1500, hit: false }, { day: 2, ml: 2000, hit: true }]}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the chart with a hit count footnote when there is enough data', () => {
    render(
      <HydrationProgressChart
        effectiveTargetMl={2000}
        data={[
          { day: 1, ml: 1500, hit: false },
          { day: 2, ml: 2000, hit: true },
          { day: 3, ml: 2500, hit: true },
        ]}
      />
    )
    expect(screen.getByText(/hydration/i)).toBeDefined()
    expect(screen.getByText(/2 \/ 3 days/i)).toBeDefined()
    expect(screen.getByText(/target:.*2000 ml/i)).toBeDefined()
  })
})
