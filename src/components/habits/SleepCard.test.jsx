import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SleepCard from './SleepCard'

const habit = {
  id: 'sleep',
  label: 'Sleep',
  desc: 'Log how many hours you slept',
  icon: '😴',
  color: '#5b8def',
}

describe('SleepCard', () => {
  it('renders the habit label and prompt when collapsed', () => {
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={() => {}} />)
    expect(screen.getByText('Sleep')).toBeDefined()
    expect(screen.getByText(habit.desc)).toBeDefined()
  })

  it('expands the input panel on click', () => {
    const { container } = render(
      <SleepCard habit={habit} value={undefined} canEdit onChange={() => {}} />,
    )
    const header = container.firstChild.firstChild
    fireEvent.click(header)
    expect(screen.getByTestId('sleep-7')).toBeDefined()
  })

  it('fires onChange with a preset value when a preset button is tapped', () => {
    const onChange = vi.fn()
    render(<SleepCard habit={habit} value={{ completed: false }} canEdit onChange={onChange} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-7'))
    expect(onChange).toHaveBeenCalledWith({ completed: true, hours: 7 })
  })

  it('exposes a custom-entry toggle even when no value is set', () => {
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={() => {}} />)
    fireEvent.click(screen.getByText('Sleep'))
    expect(screen.getByTestId('sleep-custom-toggle')).toBeDefined()
  })

  it('reveals a numeric input when the custom toggle is pressed', () => {
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={() => {}} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-custom-toggle'))
    const input = screen.getByTestId('sleep-custom-input')
    expect(input).toBeDefined()
    expect(input.min).toBe('0')
    expect(input.max).toBe('24')
    expect(input.step).toBe('0.5')
  })

  it('saves a valid custom value (e.g. 3 hours) via onChange', () => {
    const onChange = vi.fn()
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={onChange} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-custom-toggle'))
    const input = screen.getByTestId('sleep-custom-input')
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.click(screen.getByTestId('sleep-custom-save'))
    expect(onChange).toHaveBeenCalledWith({ completed: true, hours: 3 })
  })

  it('saves 0 hours successfully (edge of valid range)', () => {
    const onChange = vi.fn()
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={onChange} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-custom-toggle'))
    const input = screen.getByTestId('sleep-custom-input')
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.click(screen.getByTestId('sleep-custom-save'))
    expect(onChange).toHaveBeenCalledWith({ completed: true, hours: 0 })
  })

  it('rejects an out-of-range custom value (> 24) and does not fire onChange', () => {
    const onChange = vi.fn()
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={onChange} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-custom-toggle'))
    const input = screen.getByTestId('sleep-custom-input')
    fireEvent.change(input, { target: { value: '25' } })
    fireEvent.click(screen.getByTestId('sleep-custom-save'))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByTestId('sleep-custom-error')).toBeDefined()
  })

  it('rejects a negative custom value and does not fire onChange', () => {
    const onChange = vi.fn()
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={onChange} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-custom-toggle'))
    const input = screen.getByTestId('sleep-custom-input')
    fireEvent.change(input, { target: { value: '-1' } })
    fireEvent.click(screen.getByTestId('sleep-custom-save'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('rejects empty input as invalid', () => {
    const onChange = vi.fn()
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={onChange} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-custom-toggle'))
    fireEvent.click(screen.getByTestId('sleep-custom-save'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('saves on Enter key inside the custom input', () => {
    const onChange = vi.fn()
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={onChange} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-custom-toggle'))
    const input = screen.getByTestId('sleep-custom-input')
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith({ completed: true, hours: 3 })
  })

  it('closes the custom input on Escape without calling onChange', () => {
    const onChange = vi.fn()
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={onChange} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-custom-toggle'))
    const input = screen.getByTestId('sleep-custom-input')
    fireEvent.change(input, { target: { value: '3' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByTestId('sleep-custom-input')).toBeNull()
  })

  it('shows the logged hours in the header copy when completed', () => {
    render(
      <SleepCard habit={habit} value={{ completed: true, hours: 3 }} canEdit onChange={() => {}} />,
    )
    expect(screen.getByText('3 hours')).toBeDefined()
  })

  it('accepts 0.5 step values like 3.5', () => {
    const onChange = vi.fn()
    render(<SleepCard habit={habit} value={undefined} canEdit onChange={onChange} />)
    fireEvent.click(screen.getByText('Sleep'))
    fireEvent.click(screen.getByTestId('sleep-custom-toggle'))
    const input = screen.getByTestId('sleep-custom-input')
    fireEvent.change(input, { target: { value: '3.5' } })
    fireEvent.click(screen.getByTestId('sleep-custom-save'))
    expect(onChange).toHaveBeenCalledWith({ completed: true, hours: 3.5 })
  })
})
