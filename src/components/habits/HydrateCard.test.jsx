import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import HydrateCard from './HydrateCard'

const habit = { id: 'hydrate', label: 'Hydrate', icon: '\u{1F4A7}', desc: 'Track your water', color: '#4AAFE8', type: 'increment' }

describe('HydrateCard', () => {
  it('renders current and target ml', () => {
    render(<HydrateCard habit={habit} value={{ completed: false, current_ml: 500, target_ml: 2000 }} canEdit={true} onChange={vi.fn()} />)
    expect(screen.getByText('500 / 2000 ml')).toBeDefined()
  })

  it('shows checkmark when target is met', () => {
    render(<HydrateCard habit={habit} value={{ completed: true, current_ml: 2000, target_ml: 2000 }} canEdit={true} onChange={vi.fn()} />)
    expect(screen.getByText('\u2713')).toBeDefined()
  })

  it('calls onChange with +250ml when plus is clicked', () => {
    const onChange = vi.fn()
    render(<HydrateCard habit={habit} value={{ completed: false, current_ml: 500, target_ml: 2000 }} canEdit={true} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('hydrate-plus'))
    expect(onChange).toHaveBeenCalledWith({ completed: false, current_ml: 750, target_ml: 2000 })
  })

  it('calls onChange with -250ml when minus is clicked', () => {
    const onChange = vi.fn()
    render(<HydrateCard habit={habit} value={{ completed: false, current_ml: 500, target_ml: 2000 }} canEdit={true} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('hydrate-minus'))
    expect(onChange).toHaveBeenCalledWith({ completed: false, current_ml: 250, target_ml: 2000 })
  })

  it('does not go below 0', () => {
    const onChange = vi.fn()
    render(<HydrateCard habit={habit} value={{ completed: false, current_ml: 0, target_ml: 2000 }} canEdit={true} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('hydrate-minus'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('marks completed when reaching target', () => {
    const onChange = vi.fn()
    render(<HydrateCard habit={habit} value={{ completed: false, current_ml: 1750, target_ml: 2000 }} canEdit={true} onChange={onChange} />)
    fireEvent.click(screen.getByTestId('hydrate-plus'))
    expect(onChange).toHaveBeenCalledWith({ completed: true, current_ml: 2000, target_ml: 2000 })
  })

  it('does not show buttons when canEdit is false', () => {
    render(<HydrateCard habit={habit} value={{ completed: false, current_ml: 0, target_ml: 2000 }} canEdit={false} onChange={vi.fn()} />)
    expect(screen.queryByTestId('hydrate-plus')).toBeNull()
  })
})
