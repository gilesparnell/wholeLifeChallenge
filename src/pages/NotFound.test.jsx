import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFound from './NotFound'

const renderPage = () =>
  render(
    <MemoryRouter>
      <NotFound />
    </MemoryRouter>
  )

describe('NotFound page', () => {
  it('renders a 404 heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/404/i)
  })

  it('tells the user the page does not exist', () => {
    renderPage()
    expect(screen.getByText(/can't find|not found|doesn't exist/i)).toBeInTheDocument()
  })

  it('shows a link back to the home page', () => {
    renderPage()
    const link = screen.getByRole('link', { name: /check-in|home|back/i })
    expect(link).toHaveAttribute('href', '/')
  })
})
