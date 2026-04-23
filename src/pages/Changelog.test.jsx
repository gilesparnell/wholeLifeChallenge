import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Provide a stub changelog so the page has something deterministic to render.
vi.mock('../lib/changelogContent', () => ({
  CHANGELOG_TEXT: `# Changelog

All notable changes.

## Conventions

### Versioning

- **patch** (0.0.x) — bug fixes
- **minor** (0.x.0) — new features
- **major** (x.0.0) — breaking changes

### Entry format

Each entry is split into:

- **What's new** — customer-facing
- **Under the hood** — technical

---

## [0.10.0] — 2026-04-13

### What's new
- A brand new thing
- Another brand new thing

### Under the hood
- A technical detail

---

## [0.9.6] — 2026-04-13

### What's new
- iOS safe-area padding
`,
}))

import Changelog from './Changelog'

const renderPage = () =>
  render(
    <MemoryRouter>
      <Changelog />
    </MemoryRouter>
  )

describe('Changelog page', () => {
  it('renders the Changelog h1 heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: /changelog/i })).toBeDefined()
  })

  it('renders the latest version heading', () => {
    renderPage()
    expect(screen.getByText(/\[0\.10\.0\]/)).toBeDefined()
  })

  it('renders the previous version heading below the latest one', () => {
    renderPage()
    const headings = screen.getAllByRole('heading', { level: 2 })
    const texts = headings.map((h) => h.textContent)
    const latestIndex = texts.findIndex((t) => t.includes('0.10.0'))
    const previousIndex = texts.findIndex((t) => t.includes('0.9.6'))
    expect(latestIndex).toBeGreaterThanOrEqual(0)
    expect(previousIndex).toBeGreaterThan(latestIndex)
  })

  it("renders section headings (What's new, Under the hood) for the latest version", () => {
    renderPage()
    const headings = screen.getAllByRole('heading', { level: 3 })
    const texts = headings.map((h) => h.textContent)
    expect(texts).toContain("What's new")
    expect(texts).toContain('Under the hood')
  })

  it('renders the bullet list items', () => {
    renderPage()
    expect(screen.getByText('A brand new thing')).toBeDefined()
    expect(screen.getByText('Another brand new thing')).toBeDefined()
    expect(screen.getByText('A technical detail')).toBeDefined()
  })

  it('renders a close button', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /close|back/i })).toBeDefined()
  })

  it('navigates back when the close button is clicked and history is non-empty', () => {
    // Simulate normal in-app navigation — history has >1 entry.
    window.history.pushState({}, '', '/somewhere')
    window.history.pushState({}, '', '/changelog')
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /close changelog/i }))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  it('navigates to "/" when close is clicked and there is no prior history (direct deep link)', () => {
    // Simulate landing directly on /changelog via a shared deep link — no
    // prior in-app history to go back to. We approximate "no history" by
    // clobbering history.length via a defineProperty shim for the duration
    // of this test.
    const origLength = window.history.length
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      get: () => 1,
    })
    try {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /close changelog/i }))
      expect(mockNavigate).toHaveBeenCalledWith('/')
    } finally {
      Object.defineProperty(window.history, 'length', {
        configurable: true,
        value: origLength,
        writable: true,
      })
    }
  })

  describe('Conventions section', () => {
    it('renders a Conventions link/button instead of inlining the section', () => {
      renderPage()
      expect(
        screen.getByRole('button', { name: /^conventions$/i }),
      ).toBeDefined()
    })

    it('does NOT render the conventions body inline', () => {
      renderPage()
      // The "Versioning" h3 lives inside the conventions section — it should
      // not appear as an h3 on the page until the modal is opened.
      const h3Names = screen
        .queryAllByRole('heading', { level: 3 })
        .map((h) => h.textContent)
      expect(h3Names).not.toContain('Versioning')
      expect(h3Names).not.toContain('Entry format')
    })

    it('opens a modal with the conventions content when the link is clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /^conventions$/i }))
      expect(screen.getByTestId('conventions-modal')).toBeDefined()
      const within = screen.getByTestId('conventions-modal')
      expect(within.textContent).toMatch(/versioning/i)
      expect(within.textContent).toMatch(/entry format/i)
      expect(within.textContent).toMatch(/under the hood/i)
    })

    it('closes the modal when the modal close button is clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /^conventions$/i }))
      const modal = screen.getByTestId('conventions-modal')
      const closeBtn = modal.querySelector('[data-testid="conventions-modal-close"]')
      expect(closeBtn).not.toBeNull()
      fireEvent.click(closeBtn)
      expect(screen.queryByTestId('conventions-modal')).toBeNull()
    })

    it('closes the modal when the backdrop is clicked', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /^conventions$/i }))
      const overlay = screen.getByTestId('conventions-modal-overlay')
      fireEvent.click(overlay)
      expect(screen.queryByTestId('conventions-modal')).toBeNull()
    })
  })

  describe('inline markdown', () => {
    it('renders **bold** segments inside list items as <strong>', () => {
      renderPage()
      // The seeded changelog mock has no bold items, so assert at the DOM
      // level — the Block renderer must route through InlineMarkdown and
      // at minimum leave non-formatted bullets as plain text. For the
      // bold assertion we rely on a seeded bullet:
      // (Conventions section has "- **patch** (0.0.x) — bug fixes"
      //  — open the conventions modal to see it.)
      fireEvent.click(screen.getByRole('button', { name: /^conventions$/i }))
      const modal = screen.getByTestId('conventions-modal')
      const strongs = modal.querySelectorAll('strong')
      expect(strongs.length).toBeGreaterThan(0)
      // At least one of them matches the bolded prefix from the fixture.
      const texts = Array.from(strongs).map((s) => s.textContent)
      expect(texts).toContain('patch')
      expect(texts).toContain('What\'s new')
    })

    it('does NOT render raw ** markers in the rendered text', () => {
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /^conventions$/i }))
      const modal = screen.getByTestId('conventions-modal')
      // The modal should show "patch" bolded — NOT "**patch**" as literal.
      expect(modal.textContent).not.toMatch(/\*\*patch\*\*/)
      expect(modal.textContent).toMatch(/patch/)
    })
  })

  describe('version anchors', () => {
    it('renders each version h2 with an id matching the version slug', () => {
      renderPage()
      const headings = screen.getAllByRole('heading', { level: 2 })
      const v0_10 = headings.find((h) => h.textContent.includes('0.10.0'))
      const v0_9_6 = headings.find((h) => h.textContent.includes('0.9.6'))
      expect(v0_10).toBeDefined()
      expect(v0_10.getAttribute('id')).toBe('0.10.0')
      expect(v0_9_6).toBeDefined()
      expect(v0_9_6.getAttribute('id')).toBe('0.9.6')
    })

    it('renders a copy-link affordance next to each version heading', () => {
      renderPage()
      expect(screen.getByTestId('copy-link-0.10.0')).toBeDefined()
      expect(screen.getByTestId('copy-link-0.9.6')).toBeDefined()
    })

    it('does NOT add an id to the Conventions h2 (it has no version)', () => {
      renderPage()
      const conventionsBtn = screen.queryByRole('button', { name: /^conventions$/i })
      expect(conventionsBtn).toBeDefined()
      // Conventions is the link-button now, not an h2 in the rendered DOM
      const headings = screen.getAllByRole('heading', { level: 2 })
      const noVersionHeading = headings.find((h) => h.textContent.includes('Conventions'))
      // Should not exist as an h2 — Conventions is collapsed behind a button.
      expect(noVersionHeading).toBeUndefined()
    })

    it('the copy-link button writes the deep link URL to the clipboard', async () => {
      const writeText = vi.fn().mockResolvedValue()
      Object.assign(navigator, { clipboard: { writeText } })

      renderPage()
      fireEvent.click(screen.getByTestId('copy-link-0.10.0'))
      expect(writeText).toHaveBeenCalledTimes(1)
      const arg = writeText.mock.calls[0][0]
      expect(arg).toMatch(/\/changelog#0\.10\.0$/)
    })
  })
})
