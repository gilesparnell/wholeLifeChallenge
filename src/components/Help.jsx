import { useState, useEffect, useRef } from 'react'
import { colors, fonts } from '../styles/theme'

const InfoIcon = ({ size = 14 }) => (
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
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false) }
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
        className="wlc-help-trigger"
        style={{
          width: 24,
          height: 24,
          padding: 0,
          background: 'transparent',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textFaint,
          flexShrink: 0,
          verticalAlign: 'middle',
          transition: 'color 0.15s ease, background 0.15s ease',
        }}
      >
        <InfoIcon size={14} />
      </button>

      {isOpen && (
        <div
          data-testid="help-backdrop"
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
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
              padding: '8px 24px max(28px, env(safe-area-inset-bottom)) 24px',
              width: '100%',
              maxWidth: 440,
              boxShadow: '0 -12px 48px rgba(0, 0, 0, 0.45)',
              borderTop: `1px solid ${colors.borderSubtle}`,
              animation: 'helpSlide 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
              maxHeight: '85vh',
              overflowY: 'auto',
              fontFamily: fonts.body,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 36,
                height: 4,
                background: colors.border,
                borderRadius: 2,
                margin: '6px auto 16px',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 10,
              }}
            >
              <h3
                id="help-title"
                style={{
                  fontFamily: fonts.display,
                  fontSize: 20,
                  fontWeight: 400,
                  color: colors.text,
                  lineHeight: 1.2,
                  margin: 0,
                  letterSpacing: '-0.01em',
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
                  width: 30,
                  height: 30,
                  cursor: 'pointer',
                  color: colors.textDim,
                  fontSize: 18,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  padding: 0,
                }}
              >
                {'\u00D7'}
              </button>
            </div>
            <div className="wlc-help-body">
              {children}
            </div>
            {learnMoreHref && (
              <a
                href={learnMoreHref}
                onClick={close}
                style={{
                  display: 'inline-block',
                  marginTop: 14,
                  fontSize: 13,
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
            .wlc-help-trigger:hover, .wlc-help-trigger:focus-visible {
              color: ${colors.accent};
              background: ${colors.surfaceHover};
              outline: none;
            }
            .wlc-help-body {
              font-size: 13px;
              line-height: 1.6;
              color: ${colors.textMuted};
              font-family: ${fonts.body};
            }
            .wlc-help-body p { margin: 0 0 10px; }
            .wlc-help-body p:last-child { margin-bottom: 0; }
            .wlc-help-body ul { margin: 0 0 10px; padding-left: 18px; }
            .wlc-help-body li { margin-bottom: 4px; }
            .wlc-help-body strong { color: ${colors.text}; font-weight: 600; }
          `}</style>
        </div>
      )}
    </>
  )
}
