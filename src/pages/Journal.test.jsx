import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const saveDayMock = vi.fn()

// A day strictly before today (Day 1 of the challenge) so canEdit = true.
// CHALLENGE_START defaults to 2026-04-13; getToday() is driven by the
// system clock which in this test run sits well after 2026-04-13.
const PAST_REFLECTION_DATE = '2026-04-13'
const PAST_REFLECTION_TEXT = 'Day one thoughts'

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    data: {
      [PAST_REFLECTION_DATE]: {
        nutrition: 5,
        reflect: { completed: true, reflection_text: PAST_REFLECTION_TEXT },
      },
    },
    loading: false,
    saveDay: saveDayMock,
  }),
}))

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-barney' }, profile: {} }),
}))

const mockSharedJournal = vi.fn(() => ({ data: {}, loading: false }))
vi.mock('../hooks/useSharedJournal', () => ({
  useSharedJournal: (...args) => mockSharedJournal(...args),
}))

const mockFrom = vi.fn(() => ({
  select: () => Promise.resolve({ data: [], error: null }),
}))
vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

import Journal from './Journal'

describe('Journal page', () => {
  beforeEach(() => {
    saveDayMock.mockReset()
  })

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

  it('shows an Edit button on each past reflection card', () => {
    render(<Journal />)
    // One reflexion in the mocked data — one Edit button.
    expect(screen.getAllByRole('button', { name: /edit reflection/i })).toHaveLength(1)
  })

  it('tapping Edit opens the ActivityModal pre-filled with the saved text', () => {
    render(<Journal />)
    fireEvent.click(screen.getByRole('button', { name: /edit reflection/i }))
    const textarea = screen.getByTestId('activity-modal-textarea')
    expect(textarea.value).toBe(PAST_REFLECTION_TEXT)
  })

  it('saving the modal calls saveDay with the updated reflect payload', () => {
    render(<Journal />)
    fireEvent.click(screen.getByRole('button', { name: /edit reflection/i }))
    const textarea = screen.getByTestId('activity-modal-textarea')
    fireEvent.change(textarea, { target: { value: 'Revised thoughts' } })
    fireEvent.click(screen.getByTestId('activity-modal-save'))

    expect(saveDayMock).toHaveBeenCalledTimes(1)
    const [date, payload] = saveDayMock.mock.calls[0]
    expect(date).toBe(PAST_REFLECTION_DATE)
    expect(payload.reflect).toEqual({ completed: true, reflection_text: 'Revised thoughts' })
    expect(payload.reflection).toBe('Revised thoughts')
    // Other day fields preserved.
    expect(payload.nutrition).toBe(5)
  })

  it('closing the modal without saving leaves saveDay untouched', () => {
    render(<Journal />)
    fireEvent.click(screen.getByRole('button', { name: /edit reflection/i }))
    fireEvent.click(screen.getByTestId('activity-modal-overlay'))
    expect(saveDayMock).not.toHaveBeenCalled()
  })
})

describe('Journal empty state', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('shows the empty state when no reflections exist', async () => {
    vi.doMock('../contexts/DataContext', () => ({
      useData: () => ({ data: {}, loading: false, saveDay: vi.fn() }),
    }))
    vi.doMock('../contexts/AuthContext', () => ({
      useAuth: () => ({ user: { id: 'user-barney' }, profile: {} }),
    }))
    vi.doMock('../hooks/useSharedJournal', () => ({
      useSharedJournal: () => ({ data: {}, loading: false }),
    }))
    vi.doMock('../lib/supabase', () => ({
      supabase: { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) },
    }))
    const { default: JournalEmpty } = await import('./Journal')
    render(<JournalEmpty />)
    expect(screen.getByText(/No reflections yet/i)).toBeDefined()
  })
})

describe('Journal shared view', () => {
  beforeEach(() => {
    saveDayMock.mockReset()
    mockSharedJournal.mockReset()
    mockSharedJournal.mockReturnValue({ data: {}, loading: false })
    // OwnerSelector queries shared_journal_entries for distinct sharers —
    // seed the query so Alice appears as a selectable option.
    mockFrom.mockReset()
    mockFrom.mockImplementation(() => ({
      select: () =>
        Promise.resolve({
          data: [{ owner_id: 'u-alice', owner_name: 'Alice' }],
          error: null,
        }),
    }))
  })

  const selectAlice = async () => {
    await waitFor(() =>
      expect(
        screen.getByTestId('owner-selector').querySelectorAll('option').length,
      ).toBeGreaterThan(1),
    )
    fireEvent.change(screen.getByTestId('owner-selector'), {
      target: { value: 'u-alice' },
    })
  }

  it('mounts the OwnerSelector for scope=journal', () => {
    render(<Journal />)
    expect(screen.getByTestId('owner-selector')).toBeDefined()
  })

  it('calls useSharedJournal with null while viewing self (no fetch)', () => {
    render(<Journal />)
    expect(mockSharedJournal).toHaveBeenCalledWith(null)
  })

  it('swaps to the shared source when a different owner is selected', async () => {
    const SHARED_DATE = '2026-04-14'
    mockSharedJournal.mockImplementation((ownerId) =>
      ownerId === 'u-alice'
        ? {
            data: {
              [SHARED_DATE]: { reflect: { reflection_text: 'Shared thought' } },
            },
            loading: false,
          }
        : { data: {}, loading: false },
    )
    render(<Journal />)
    await selectAlice()
    expect(mockSharedJournal).toHaveBeenLastCalledWith('u-alice')
    expect(screen.getByText('Shared thought')).toBeDefined()
  })

  it('hides Edit buttons when viewing another user\'s reflections', async () => {
    const SHARED_DATE = '2026-04-14'
    mockSharedJournal.mockReturnValue({
      data: { [SHARED_DATE]: { reflect: { reflection_text: 'Hello' } } },
      loading: false,
    })
    render(<Journal />)
    await selectAlice()
    expect(screen.queryByRole('button', { name: /edit reflection/i })).toBeNull()
  })

  it('hides the Score footer line when viewing another user\'s reflections', async () => {
    const SHARED_DATE = '2026-04-14'
    mockSharedJournal.mockReturnValue({
      data: { [SHARED_DATE]: { reflect: { reflection_text: 'Hello' } } },
      loading: false,
    })
    render(<Journal />)
    await selectAlice()
    expect(screen.queryByText(/Score: /)).toBeNull()
  })

  it('shows a "nothing shared yet" empty state when shared data is empty', async () => {
    mockSharedJournal.mockReturnValue({ data: {}, loading: false })
    render(<Journal />)
    await selectAlice()
    expect(screen.getByText(/hasn.t shared any reflections/i)).toBeDefined()
  })
})
