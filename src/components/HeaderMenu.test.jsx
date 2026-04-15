import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HeaderMenu from './HeaderMenu'

const renderMenu = (props = {}) => {
  const defaults = {
    isAdmin: false,
    theme: 'dark',
    onToggleTheme: vi.fn(),
    onSignOut: vi.fn(),
    signedIn: true,
  }
  return render(
    <MemoryRouter>
      <HeaderMenu {...defaults} {...props} />
    </MemoryRouter>
  )
}

describe('HeaderMenu', () => {
  describe('trigger', () => {
    it('renders a hamburger button with an accessible label', () => {
      renderMenu()
      const trigger = screen.getByRole('button', { name: /menu/i })
      expect(trigger).toBeDefined()
      expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    })

    it('starts with the menu closed', () => {
      renderMenu()
      expect(screen.queryByRole('menu')).toBeNull()
    })
  })

  describe('opening and closing', () => {
    it('opens the menu when the hamburger is clicked', () => {
      renderMenu()
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      expect(screen.getByRole('menu')).toBeDefined()
    })

    it('closes the menu when Escape is pressed', () => {
      renderMenu()
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('closes the menu when the backdrop is clicked', () => {
      renderMenu()
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      fireEvent.click(screen.getByTestId('header-menu-backdrop'))
      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('does not close when clicking inside the menu panel', () => {
      renderMenu()
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      fireEvent.click(screen.getByRole('menu'))
      expect(screen.getByRole('menu')).toBeDefined()
    })
  })

  describe('items', () => {
    it('always shows My Preferences', () => {
      renderMenu()
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      const link = screen.getByRole('menuitem', { name: /my preferences/i })
      expect(link.getAttribute('href')).toBe('/preferences')
    })

    it('always shows User Guide as an external link', () => {
      renderMenu()
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      const link = screen.getByRole('menuitem', { name: /user guide/i })
      expect(link.getAttribute('href')).toMatch(/user-guide/i)
      expect(link.getAttribute('target')).toBe('_blank')
    })

    it('shows Admin only when isAdmin is true', () => {
      renderMenu({ isAdmin: false })
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      expect(screen.queryByRole('menuitem', { name: /^admin$/i })).toBeNull()
    })

    it('shows Admin when isAdmin is true', () => {
      renderMenu({ isAdmin: true })
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      const link = screen.getByRole('menuitem', { name: /^admin$/i })
      expect(link.getAttribute('href')).toBe('/admin')
    })

    it('shows a theme toggle that calls onToggleTheme', () => {
      const onToggleTheme = vi.fn()
      renderMenu({ onToggleTheme, theme: 'dark' })
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      const toggle = screen.getByRole('menuitem', { name: /light mode|theme/i })
      fireEvent.click(toggle)
      expect(onToggleTheme).toHaveBeenCalledOnce()
    })

    it('shows Sign out only when signedIn is true', () => {
      renderMenu({ signedIn: false })
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      expect(screen.queryByRole('menuitem', { name: /sign out/i })).toBeNull()
    })

    it('calls onSignOut when Sign out is clicked', () => {
      const onSignOut = vi.fn()
      renderMenu({ onSignOut })
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }))
      expect(onSignOut).toHaveBeenCalledOnce()
    })
  })

  describe('auto-close after navigation', () => {
    it('closes after clicking a menu item link', () => {
      renderMenu()
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      fireEvent.click(screen.getByRole('menuitem', { name: /my preferences/i }))
      expect(screen.queryByRole('menu')).toBeNull()
    })

    it('closes after clicking sign out', () => {
      renderMenu()
      fireEvent.click(screen.getByRole('button', { name: /menu/i }))
      fireEvent.click(screen.getByRole('menuitem', { name: /sign out/i }))
      expect(screen.queryByRole('menu')).toBeNull()
    })
  })
})
