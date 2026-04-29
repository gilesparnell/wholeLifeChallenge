// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Ask from './Ask'

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({ data: {} }),
}))

vi.mock('../lib/dates', () => ({
  getDayIndex: () => 5,
  getToday: () => '2026-04-18',
  getAllDates: () => Array.from({ length: 75 }, (_, i) => {
    const d = new Date('2026-04-13T00:00:00')
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  }),
  getChallengeDays: () => 75,
}))

describe('Ask page', () => {
  it('renders the heading and input', () => {
    render(<Ask />)
    expect(screen.getByText('Ask about your challenge')).toBeDefined()
    expect(screen.getByPlaceholderText(/e\.g\./i)).toBeDefined()
  })

  it('renders example prompt buttons', () => {
    render(<Ask />)
    expect(screen.getByText('Why is my streak 0?')).toBeDefined()
  })

  it('Ask button is disabled when input is empty', () => {
    render(<Ask />)
    const btn = screen.getByRole('button', { name: 'Ask' })
    expect(btn.disabled).toBe(true)
  })
})
