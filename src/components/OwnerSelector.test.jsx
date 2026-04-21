import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

import OwnerSelector from './OwnerSelector'

const buildViewChain = (rows) => ({
  select: () => Promise.resolve({ data: rows, error: null }),
})

describe('OwnerSelector', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('renders "Me" by default with the current user id selected', async () => {
    mockFrom.mockReturnValue(buildViewChain([]))
    render(<OwnerSelector scope="journal" selfId="u1" value="u1" onChange={() => {}} />)
    expect(screen.getByTestId('owner-selector')).toBeDefined()
    expect(screen.getByTestId('owner-selector').value).toBe('u1')
    await waitFor(() => expect(screen.getByText('Me')).toBeDefined())
  })

  it('lists distinct sharers from the journal view when scope=journal', async () => {
    mockFrom.mockImplementation((view) => {
      if (view === 'shared_journal_entries') {
        return buildViewChain([
          { owner_id: 'u1', owner_name: 'Self' },
          { owner_id: 'u2', owner_name: 'Alice' },
          { owner_id: 'u2', owner_name: 'Alice' },
          { owner_id: 'u3', owner_name: 'Bob' },
        ])
      }
      return buildViewChain([])
    })
    render(<OwnerSelector scope="journal" selfId="u1" value="u1" onChange={() => {}} />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeDefined())
    expect(screen.getByText('Bob')).toBeDefined()
  })

  it('lists distinct sharers from the wellness view when scope=wellness', async () => {
    mockFrom.mockImplementation((view) => {
      if (view === 'shared_wellness_entries') {
        return buildViewChain([
          { owner_id: 'u2', owner_name: 'Alice' },
          { owner_id: 'u3', owner_name: 'Bob' },
        ])
      }
      return buildViewChain([])
    })
    render(<OwnerSelector scope="wellness" selfId="u1" value="u1" onChange={() => {}} />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeDefined())
    expect(screen.getByText('Bob')).toBeDefined()
  })

  it('excludes self from the "shared with me" list (self is always "Me")', async () => {
    mockFrom.mockImplementation(() =>
      buildViewChain([
        { owner_id: 'u1', owner_name: 'MySelf' },
        { owner_id: 'u2', owner_name: 'Alice' },
      ]),
    )
    render(<OwnerSelector scope="journal" selfId="u1" value="u1" onChange={() => {}} />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeDefined())
    // Should render a single "Me" option, not also "MySelf"
    expect(screen.queryByText('MySelf')).toBeNull()
    expect(screen.getAllByText(/^Me$/).length).toBe(1)
  })

  it('fires onChange with the selected owner id when changed', async () => {
    mockFrom.mockImplementation(() =>
      buildViewChain([{ owner_id: 'u2', owner_name: 'Alice' }]),
    )
    const onChange = vi.fn()
    render(<OwnerSelector scope="journal" selfId="u1" value="u1" onChange={onChange} />)
    await waitFor(() => expect(screen.getByText('Alice')).toBeDefined())
    const select = screen.getByTestId('owner-selector')
    fireEvent.change(select, { target: { value: 'u2' } })
    expect(onChange).toHaveBeenCalledWith('u2')
  })

  it('renders nothing beyond "Me" when no sharers exist (selector still visible)', async () => {
    mockFrom.mockImplementation(() => buildViewChain([]))
    render(<OwnerSelector scope="journal" selfId="u1" value="u1" onChange={() => {}} />)
    await waitFor(() => expect(screen.getByText('Me')).toBeDefined())
    const select = screen.getByTestId('owner-selector')
    expect(select.querySelectorAll('option').length).toBe(1)
  })

  it('handles a view error gracefully — only "Me" is shown', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => Promise.resolve({ data: null, error: { message: 'boom' } }),
    }))
    render(<OwnerSelector scope="journal" selfId="u1" value="u1" onChange={() => {}} />)
    await waitFor(() => expect(screen.getByText('Me')).toBeDefined())
    const select = screen.getByTestId('owner-selector')
    expect(select.querySelectorAll('option').length).toBe(1)
  })

  it('is visible (not display:none) when no sharers exist so the user can see the control', async () => {
    mockFrom.mockImplementation(() => buildViewChain([]))
    render(<OwnerSelector scope="journal" selfId="u1" value="u1" onChange={() => {}} />)
    const select = screen.getByTestId('owner-selector')
    // display:none would hide the "Viewing:" label + selector chrome entirely
    expect(select.style.display).not.toBe('none')
    // The "Viewing:" label MUST render so the user can see where the control is
    expect(screen.getByText(/Viewing/i)).toBeDefined()
  })

  it('uses the scope to label the selector ("Viewing journal" vs "Viewing wellness")', async () => {
    mockFrom.mockImplementation(() => buildViewChain([]))
    const { unmount } = render(
      <OwnerSelector scope="journal" selfId="u1" value="u1" onChange={() => {}} label="Journal owner" />,
    )
    expect(screen.getByText(/Journal owner/i)).toBeDefined()
    unmount()
    render(
      <OwnerSelector scope="wellness" selfId="u1" value="u1" onChange={() => {}} label="Wellness owner" />,
    )
    expect(screen.getByText(/Wellness owner/i)).toBeDefined()
  })
})
