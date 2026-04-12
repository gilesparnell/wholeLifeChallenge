import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExerciseCard from './ExerciseCard'

const habit = { id: 'exercise', label: 'Exercise', icon: '\u{1F3C3}', desc: '10+ min activity', color: '#E8634A', type: 'dropdown' }
const exerciseTypes = ['Running', 'Swimming', 'Weights', 'Yoga']

describe('ExerciseCard', () => {
  // Existing behaviour tests
  it('renders habit label and description when not completed', () => {
    render(<ExerciseCard habit={habit} value={{ completed: false, type: '' }} canEdit={true} exerciseTypes={exerciseTypes} onChange={vi.fn()} />)
    expect(screen.getByText('Exercise')).toBeDefined()
    expect(screen.getByText('10+ min activity')).toBeDefined()
  })

  it('shows dropdown options when clicked', () => {
    render(<ExerciseCard habit={habit} value={{ completed: false, type: '' }} canEdit={true} exerciseTypes={exerciseTypes} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Exercise'))
    expect(screen.getByTestId('exercise-option-Running')).toBeDefined()
    expect(screen.getByTestId('exercise-option-Yoga')).toBeDefined()
  })

  it('calls onChange with type when an exercise type is selected', () => {
    const onChange = vi.fn()
    render(<ExerciseCard habit={habit} value={{ completed: false, type: '' }} canEdit={true} exerciseTypes={exerciseTypes} onChange={onChange} />)
    fireEvent.click(screen.getByText('Exercise'))
    fireEvent.click(screen.getByTestId('exercise-option-Running'))
    expect(onChange).toHaveBeenCalledWith({ completed: true, type: 'Running', duration_minutes: null })
  })

  it('calls onChange with cleared state when Clear is clicked', () => {
    const onChange = vi.fn()
    render(<ExerciseCard habit={habit} value={{ completed: true, type: 'Running' }} canEdit={true} exerciseTypes={exerciseTypes} onChange={onChange} />)
    fireEvent.click(screen.getByText('Running'))
    fireEvent.click(screen.getByText('Clear'))
    expect(onChange).toHaveBeenCalledWith({ completed: false, type: '', duration_minutes: null })
  })

  it('does not open dropdown when canEdit is false', () => {
    render(<ExerciseCard habit={habit} value={{ completed: false, type: '' }} canEdit={false} exerciseTypes={exerciseTypes} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Exercise'))
    expect(screen.queryByTestId('exercise-option-Running')).toBeNull()
  })

  // Duration tracking tests
  it('shows duration buttons after selecting an exercise type', () => {
    render(<ExerciseCard habit={habit} value={{ completed: true, type: 'Running', duration_minutes: null }} canEdit={true} exerciseTypes={exerciseTypes} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Running'))
    expect(screen.getByTestId('duration-15')).toBeDefined()
    expect(screen.getByTestId('duration-30')).toBeDefined()
    expect(screen.getByTestId('duration-45')).toBeDefined()
    expect(screen.getByTestId('duration-60')).toBeDefined()
  })

  it('does not show duration buttons before selecting a type', () => {
    render(<ExerciseCard habit={habit} value={{ completed: false, type: '' }} canEdit={true} exerciseTypes={exerciseTypes} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Exercise'))
    expect(screen.queryByTestId('duration-30')).toBeNull()
  })

  it('calls onChange with duration when a duration button is clicked', () => {
    const onChange = vi.fn()
    render(<ExerciseCard habit={habit} value={{ completed: true, type: 'Running', duration_minutes: null }} canEdit={true} exerciseTypes={exerciseTypes} onChange={onChange} />)
    fireEvent.click(screen.getByText('Running'))
    fireEvent.click(screen.getByTestId('duration-30'))
    expect(onChange).toHaveBeenCalledWith({ completed: true, type: 'Running', duration_minutes: 30 })
  })

  it('displays the selected duration on the card', () => {
    render(<ExerciseCard habit={habit} value={{ completed: true, type: 'Running', duration_minutes: 45 }} canEdit={true} exerciseTypes={exerciseTypes} onChange={vi.fn()} />)
    expect(screen.getByText(/Running/)).toBeDefined()
    expect(screen.getByText(/45 min/)).toBeDefined()
  })

  it('highlights the currently selected duration button', () => {
    render(<ExerciseCard habit={habit} value={{ completed: true, type: 'Running', duration_minutes: 30 }} canEdit={true} exerciseTypes={exerciseTypes} onChange={vi.fn()} />)
    fireEvent.click(screen.getByText(/Running/))
    const btn = screen.getByTestId('duration-30')
    // Browser renders hex as rgb — check for rgb equivalent of #E8634A
    expect(btn.style.background).toContain('rgb(232, 99, 74)')
  })

  it('preserves duration when changing exercise type', () => {
    const onChange = vi.fn()
    render(<ExerciseCard habit={habit} value={{ completed: true, type: 'Running', duration_minutes: 30 }} canEdit={true} exerciseTypes={exerciseTypes} onChange={onChange} />)
    fireEvent.click(screen.getByText(/Running/))
    fireEvent.click(screen.getByTestId('exercise-option-Swimming'))
    expect(onChange).toHaveBeenCalledWith({ completed: true, type: 'Swimming', duration_minutes: 30 })
  })

  it('clears duration when exercise is cleared', () => {
    const onChange = vi.fn()
    render(<ExerciseCard habit={habit} value={{ completed: true, type: 'Running', duration_minutes: 30 }} canEdit={true} exerciseTypes={exerciseTypes} onChange={onChange} />)
    fireEvent.click(screen.getByText(/Running/))
    fireEvent.click(screen.getByText('Clear'))
    expect(onChange).toHaveBeenCalledWith({ completed: false, type: '', duration_minutes: null })
  })

  it('handles legacy data without duration_minutes field', () => {
    render(<ExerciseCard habit={habit} value={{ completed: true, type: 'Running' }} canEdit={true} exerciseTypes={exerciseTypes} onChange={vi.fn()} />)
    expect(screen.getByText(/Running/)).toBeDefined()
  })
})
