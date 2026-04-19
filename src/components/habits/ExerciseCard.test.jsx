import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ExerciseCard from './ExerciseCard'

const habit = {
  id: 'exercise',
  label: 'Exercise',
  icon: '\u{1F3C3}',
  desc: '10+ min activity',
  color: '#E8634A',
  type: 'dropdown',
}
const exerciseTypes = ['Running', 'Swimming', 'Weights', 'Yoga']

const empty = { completed: false, entries: [] }
const oneEntry = {
  completed: true,
  entries: [{ type: 'Running', duration_minutes: 30 }],
}
const threeEntries = {
  completed: true,
  entries: [
    { type: 'Running', duration_minutes: 30 },
    { type: 'Swimming', duration_minutes: 15 },
    { type: 'Yoga', duration_minutes: 45 },
  ],
}

describe('ExerciseCard — empty state', () => {
  it('renders the habit label and description when no entries', () => {
    render(
      <ExerciseCard
        habit={habit}
        value={empty}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Exercise')).toBeDefined()
    expect(screen.getByText('10+ min activity')).toBeDefined()
  })

  it('shows type-picker buttons when the empty card is opened', () => {
    render(
      <ExerciseCard
        habit={habit}
        value={empty}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Exercise'))
    expect(screen.getByTestId('exercise-option-Running')).toBeDefined()
    expect(screen.getByTestId('exercise-option-Yoga')).toBeDefined()
  })

  it('does not open the picker when canEdit is false', () => {
    render(
      <ExerciseCard
        habit={habit}
        value={empty}
        canEdit={false}
        exerciseTypes={exerciseTypes}
        onChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByText('Exercise'))
    expect(screen.queryByTestId('exercise-option-Running')).toBeNull()
  })

  it('emits an entry on type → duration confirm', () => {
    const onChange = vi.fn()
    render(
      <ExerciseCard
        habit={habit}
        value={empty}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByText('Exercise'))
    fireEvent.click(screen.getByTestId('exercise-option-Running'))
    fireEvent.click(screen.getByTestId('duration-30'))
    expect(onChange).toHaveBeenLastCalledWith({
      completed: true,
      entries: [{ type: 'Running', duration_minutes: 30 }],
    })
  })
})

describe('ExerciseCard — filled state (multi-entry)', () => {
  it('renders one row per entry with type and duration', () => {
    render(
      <ExerciseCard
        habit={habit}
        value={threeEntries}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('entry-row-0')).toBeDefined()
    expect(screen.getByTestId('entry-row-1')).toBeDefined()
    expect(screen.getByTestId('entry-row-2')).toBeDefined()
    expect(screen.getByText(/Running/)).toBeDefined()
    expect(screen.getByText(/Swimming/)).toBeDefined()
    expect(screen.getByText(/Yoga/)).toBeDefined()
  })

  it('shows a total summary across all entries', () => {
    render(
      <ExerciseCard
        habit={habit}
        value={threeEntries}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={vi.fn()}
      />,
    )
    // 30 + 15 + 45 = 90 min = 1h 30m
    expect(screen.getByTestId('entries-total')).toHaveTextContent(/1h\s*30m|90\s*min/i)
  })

  it('shows a + Add another button when entries exist', () => {
    render(
      <ExerciseCard
        habit={habit}
        value={oneEntry}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId('entry-add-another')).toBeDefined()
  })

  it('opens the type picker when + Add another is clicked', () => {
    render(
      <ExerciseCard
        habit={habit}
        value={oneEntry}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByTestId('entry-add-another'))
    expect(screen.getByTestId('exercise-option-Swimming')).toBeDefined()
  })

  it('appends a new entry after type + duration are chosen', () => {
    const onChange = vi.fn()
    render(
      <ExerciseCard
        habit={habit}
        value={oneEntry}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByTestId('entry-add-another'))
    fireEvent.click(screen.getByTestId('exercise-option-Swimming'))
    fireEvent.click(screen.getByTestId('duration-15'))
    expect(onChange).toHaveBeenLastCalledWith({
      completed: true,
      entries: [
        { type: 'Running', duration_minutes: 30 },
        { type: 'Swimming', duration_minutes: 15 },
      ],
    })
  })

  it('removes the entry when × is tapped, keeping completed true if others remain', () => {
    const onChange = vi.fn()
    render(
      <ExerciseCard
        habit={habit}
        value={threeEntries}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByTestId('entry-remove-1')) // remove Swimming
    expect(onChange).toHaveBeenLastCalledWith({
      completed: true,
      entries: [
        { type: 'Running', duration_minutes: 30 },
        { type: 'Yoga', duration_minutes: 45 },
      ],
    })
  })

  it('flips completed back to false when the last entry is removed', () => {
    const onChange = vi.fn()
    render(
      <ExerciseCard
        habit={habit}
        value={oneEntry}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByTestId('entry-remove-0'))
    expect(onChange).toHaveBeenLastCalledWith({
      completed: false,
      entries: [],
    })
  })

  it('renders backward-compatibly for the legacy single-entry shape', () => {
    const legacy = { completed: true, type: 'Cycling', duration_minutes: 45 }
    render(
      <ExerciseCard
        habit={habit}
        value={legacy}
        canEdit={true}
        exerciseTypes={exerciseTypes}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/Cycling/)).toBeDefined()
    expect(screen.getByTestId('entries-total')).toHaveTextContent(/45\s*min/i)
  })

  it('hides remove buttons and Add Another when canEdit is false', () => {
    render(
      <ExerciseCard
        habit={habit}
        value={oneEntry}
        canEdit={false}
        exerciseTypes={exerciseTypes}
        onChange={vi.fn()}
      />,
    )
    expect(screen.queryByTestId('entry-remove-0')).toBeNull()
    expect(screen.queryByTestId('entry-add-another')).toBeNull()
  })
})
