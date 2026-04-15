import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PeerDeltaChart from './PeerDeltaChart'
import CorrelationInsights from './CorrelationInsights'

describe('PeerDeltaChart', () => {
  it('renders nothing when there are no peers', () => {
    const { container } = render(
      <PeerDeltaChart
        delta={[
          { day: 1, user: 10, peerAvg: 5, delta: 5 },
          { day: 2, user: 20, peerAvg: 10, delta: 10 },
          { day: 3, user: 30, peerAvg: 15, delta: 15 },
        ]}
        peerCount={0}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when there are fewer than 3 data points', () => {
    const { container } = render(
      <PeerDeltaChart
        delta={[
          { day: 1, user: 10, peerAvg: 5, delta: 5 },
          { day: 2, user: 20, peerAvg: 10, delta: 10 },
        ]}
        peerCount={2}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders the heading and help trigger when data is sufficient', () => {
    render(
      <PeerDeltaChart
        delta={[
          { day: 1, user: 10, peerAvg: 5, delta: 5 },
          { day: 2, user: 20, peerAvg: 10, delta: 10 },
          { day: 3, user: 30, peerAvg: 15, delta: 15 },
        ]}
        peerCount={2}
      />
    )
    expect(screen.getByText(/you vs group average/i)).toBeDefined()
    expect(screen.getByRole('button', { name: /about you vs group average/i })).toBeDefined()
  })
})

describe('CorrelationInsights', () => {
  it('renders a "come back in a week" placeholder when there is insufficient data', () => {
    render(<CorrelationInsights correlations={[]} enoughData={false} />)
    expect(screen.getByText(/come back in a week/i)).toBeDefined()
  })

  it('renders a "nothing standing out" placeholder when enoughData but no correlations passed the threshold', () => {
    render(<CorrelationInsights correlations={[]} enoughData={true} />)
    expect(screen.getByText(/nothing standing out/i)).toBeDefined()
  })

  it('renders up to 5 correlation cards when there is data to show', () => {
    render(
      <CorrelationInsights
        enoughData={true}
        correlations={[
          { x: 'sleepHours', y: 'nutrition', r: 0.56, n: 12 },
          { x: 'energyLevel', y: 'score', r: 0.48, n: 10 },
        ]}
      />
    )
    expect(screen.getByText(/patterns we.re seeing/i)).toBeDefined()
    expect(screen.getByText(/sleep hours/i)).toBeDefined()
    expect(screen.getByText(/energy/i)).toBeDefined()
  })

  it('caps the number of rendered cards at 5', () => {
    const correlations = Array.from({ length: 8 }, (_, i) => ({
      x: 'sleepHours',
      y: 'nutrition',
      r: 0.4 + i * 0.01,
      n: 10,
    }))
    const { container } = render(
      <CorrelationInsights correlations={correlations} enoughData={true} />
    )
    const cards = container.querySelectorAll('p + p')
    // 5 correlation cards each produce a "n = ..." paragraph
    const nParagraphs = Array.from(cards).filter((p) => p.textContent?.includes('n ='))
    expect(nParagraphs.length).toBeLessThanOrEqual(5)
  })
})
