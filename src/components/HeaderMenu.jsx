import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { colors, fonts } from '../styles/theme'

const USER_GUIDE_URL = 'https://gilesparnell.github.io/wholeLifeChallenge/user-guide.html'

const HamburgerIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

export default function HeaderMenu({
  isAdmin = false,
  theme = 'dark',
  onToggleTheme,
  onSignOut,
  signedIn = true,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const close = () => setIsOpen(false)

  const handleItemClick = (fn) => () => {
    if (typeof fn === 'function') fn()
    close()
  }

  const itemStyle = {
    display: 'block',
    padding: '12px 18px',
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.text,
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.12s ease',
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          padding: 6,
          cursor: 'pointer',
          color: colors.textGhost,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
        }}
      >
        <HamburgerIcon size={20} />
      </button>

      {isOpen && createPortal(
        <div
          data-testid="header-menu-backdrop"
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'transparent',
            zIndex: 1800,
          }}
        >
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `calc(16px + env(safe-area-inset-top))`,
              right: `calc(16px + env(safe-area-inset-right))`,
              minWidth: 220,
              background: colors.surface,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: 12,
              boxShadow: '0 18px 48px rgba(0, 0, 0, 0.45)',
              padding: '6px 0',
              fontFamily: fonts.body,
              textTransform: 'none',
              letterSpacing: 'normal',
              zIndex: 1810,
              animation: 'menuFade 0.18s ease',
            }}
          >
            <Link
              role="menuitem"
              to="/preferences"
              onClick={handleItemClick()}
              className="wlc-menu-item"
              style={itemStyle}
            >
              My Preferences
            </Link>

            {isAdmin && (
              <Link
                role="menuitem"
                to="/admin"
                onClick={handleItemClick()}
                className="wlc-menu-item"
                style={{ ...itemStyle, color: colors.purple }}
              >
                Admin
              </Link>
            )}

            <a
              role="menuitem"
              href={USER_GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleItemClick()}
              className="wlc-menu-item"
              style={itemStyle}
            >
              User Guide
            </a>

            <div style={{ height: 1, background: colors.borderSubtle, margin: '6px 0' }} />

            <button
              role="menuitem"
              type="button"
              onClick={handleItemClick(onToggleTheme)}
              className="wlc-menu-item"
              style={itemStyle}
            >
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>

            {signedIn && (
              <button
                role="menuitem"
                type="button"
                onClick={handleItemClick(onSignOut)}
                className="wlc-menu-item"
                style={{ ...itemStyle, color: colors.textDim }}
              >
                Sign out
              </button>
            )}

            <style>{`
              @keyframes menuFade {
                from { opacity: 0; transform: translateY(-6px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .wlc-menu-item:hover, .wlc-menu-item:focus-visible {
                background: ${colors.surfaceHover};
                outline: none;
              }
            `}</style>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
