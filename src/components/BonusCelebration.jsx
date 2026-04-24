import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { colors, fonts } from '../styles/theme'
import { BONUS_INFO } from '../lib/bonuses'

const DISMISS_MS = 6000

const HEADLINES = {
  indulgence: 'Indulgence Earned!',
  restDay: 'Rest Day Earned!',
  nightOwl: 'Night Owl Unlocked!',
  freeDay: 'Free Day Unlocked!',
}

const SUBTEXT = {
  indulgence: 'Four stellar nutrition days in a row. Treat yourself without guilt.',
  restDay: 'Ten straight days of exercise. Your body has earned a day off.',
  nightOwl: 'Six nights of quality sleep. Cash it in when you need a late one.',
  freeDay: 'Twenty-one near-perfect days. A perfect 35 / 35, on demand.',
}

const KEYFRAMES = `
@keyframes bcBackdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes bcCardIn {
  from { opacity: 0; transform: scale(0.78) translateY(24px); }
  60%  { transform: scale(1.03) translateY(-4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes bcIconIn {
  0%   { transform: scale(0.2) rotate(-15deg); opacity: 0; }
  65%  { transform: scale(1.2) rotate(8deg); }
  80%  { transform: scale(0.93) rotate(-3deg); }
  to   { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes bcRing {
  0%   { transform: scale(1); opacity: 0.55; }
  100% { transform: scale(2.6); opacity: 0; }
}
@keyframes bcCountdown {
  from { width: 100%; }
  to   { width: 0%; }
}
@keyframes bcTextIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`

export default function BonusCelebration({ bonusKey, onDismiss }) {
  const info = BONUS_INFO[bonusKey]
  const color = colors[info.colorKey]

  const dismiss = useCallback(() => onDismiss(), [onDismiss])

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(dismiss, DISMISS_MS)
    return () => clearTimeout(t)
  }, [dismiss])

  // ESC key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dismiss])

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
      aria-label={`${info.label} bonus earned`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        animation: 'bcBackdropIn 0.25s ease',
        cursor: 'pointer',
        padding: '24px',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Card */}
      <div
        style={{
          position: 'relative',
          background: colors.surface,
          border: `1px solid ${color}55`,
          borderRadius: 28,
          padding: '44px 36px 36px',
          maxWidth: 360,
          width: '100%',
          textAlign: 'center',
          animation: 'bcCardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: `0 0 80px ${color}28, 0 32px 80px rgba(0,0,0,0.6)`,
          overflow: 'hidden',
          cursor: 'default',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + rings */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
          {/* Rings */}
          {[0, 0.45, 0.9].map((delay, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                inset: -(20 + i * 18),
                borderRadius: '50%',
                border: `1.5px solid ${color}`,
                animation: `bcRing 2.4s ease-out ${delay}s infinite`,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Icon */}
          <span
            style={{
              fontSize: 76,
              lineHeight: 1,
              animation: 'bcIconIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both',
              filter: `drop-shadow(0 0 20px ${color}88)`,
              display: 'block',
            }}
          >
            {info.icon}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: 30,
            fontWeight: 700,
            color: color,
            marginBottom: 10,
            letterSpacing: '-0.3px',
            animation: 'bcTextIn 0.4s ease 0.4s both',
          }}
        >
          {HEADLINES[bonusKey]}
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: 14,
            color: colors.textMuted,
            lineHeight: 1.55,
            marginBottom: 32,
            animation: 'bcTextIn 0.4s ease 0.5s both',
          }}
        >
          {SUBTEXT[bonusKey]}
        </div>

        {/* Dismiss hint */}
        <div
          style={{
            fontSize: 11,
            color: colors.textGhost,
            textTransform: 'uppercase',
            letterSpacing: 2,
            animation: 'bcTextIn 0.4s ease 0.65s both',
          }}
        >
          Tap anywhere to continue
        </div>

        {/* Countdown bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 3,
            borderRadius: '0 0 0 28px',
            background: color,
            animation: `bcCountdown ${DISMISS_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>,
    document.body,
  )
}
