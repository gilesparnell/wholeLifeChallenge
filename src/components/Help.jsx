import { useState, useEffect, useRef } from 'react'
import { colors, fonts } from '../styles/theme'

const InfoIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </svg>
)

export default function Help({ title, children, learnMoreHref }) {
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

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  const close = () => {
    setIsOpen(false)
    // Restore focus to the trigger so keyboard users don't lose their place
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`About ${title}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(true)
        }}
        style={{
          // 44x44 hit area per Apple HIG, 20x20 visual
          width: 44,
          height: 44,
          padding: 0,
          margin: -12, // cancel the hit-area expansion so it visually sits like a 20px icon
          background: 'transparent',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textDim,
          flexShrink: 0,
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent }}
        onMouseLeave={(e) => { e.currentTarget.style.color = colors.textDim }}
      >
        <InfoIcon size={16} />
      </button>

      {isOpen && (
        <div
          data-testid="help-backdrop"
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 2000,
            animation: 'helpFade 0.2s ease',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.surface,
              color: colors.text,
              borderRadius: '20px 20px 0 0',
              padding: '10px 20px max(24px, env(safe-area-inset-bottom)) 20px',
              width: '100%',
              maxWidth: 520,
              boxShadow: '0 -12px 48px rgba(0, 0, 0, 0.4)',
              borderTop: `1px solid ${colors.borderSubtle}`,
              animation: 'helpSlide 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            {/* Grab handle */}
            <div
              aria-hidden="true"
              style={{
                width: 40,
                height: 4,
                background: colors.border,
                borderRadius: 2,
                margin: '6px auto 18px',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <h3
                id="help-title"
                style={{
                  fontFamily: fonts.display,
                  fontSize: 22,
                  fontWeight: 600,
                  color: colors.text,
                  lineHeight: 1.2,
                  margin: 0,
                }}
              >
                {title}
              </h3>
              <button
                type="button"
                aria-label="Close"
                onClick={close}
                style={{
                  background: colors.surfaceHover,
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  cursor: 'pointer',
                  color: colors.textDim,
                  fontSize: 20,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {'\u00D7'}
              </button>
            </div>
            <div
              style={{
                fontSize: 15,
                lineHeight: 1.55,
                color: colors.textMuted,
                fontFamily: fonts.body,
              }}
            >
              {children}
            </div>
            {learnMoreHref && (
              <a
                href={learnMoreHref}
                onClick={close}
                style={{
                  display: 'inline-block',
                  marginTop: 16,
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.accent,
                  textDecoration: 'none',
                }}
              >
                Learn more &rarr;
              </a>
            )}
          </div>
          <style>{`
            @keyframes helpFade { from { opacity: 0; } to { opacity: 1; } }
            @keyframes helpSlide { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          `}</style>
        </div>
      )}
    </>
  )
}
