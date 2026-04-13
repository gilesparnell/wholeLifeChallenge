import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({ data: {}, loading: false }),
}))

import Journal from './Journal'

describe('Journal page', () => {
  it('renders the Reflections heading with a Help trigger', () => {
    render(<Journal />)
    expect(screen.getByRole('heading', { name: /reflections/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /about why reflect/i })).toBeDefined()
  })

  it('opens the Help sheet when the trigger is tapped', () => {
    render(<Journal />)
    fireEvent.click(screen.getByRole('button', { name: /about why reflect/i }))
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByText(/5 points a day/i)).toBeDefined()
  })

  it('shows the empty state when no reflections exist', () => {
    render(<Journal />)
    expect(screen.getByText(/No reflections yet/i)).toBeDefined()
  })
})
