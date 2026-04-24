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
  freeDay: 'Twenty-one near-perfect days. A perfect 35 / 35, on demand.',
}

// 32 confetti pieces in a full-circle spread, deterministic positions.
// Each piece arcs outward: starts at icon centre, peaks slightly above mid-travel,
// then falls to the final position (the ty downward bias creates gravity feel).
const CONFETTI = Array.from({ length: 32 }, (_, i) => {
  const rad = ((i / 32) * 360 - 90) * (Math.PI / 180) // -90° so index 0 launches upward
  const spread = 95 + (i % 5) * 28                    // 95 / 123 / 151 / 179 / 207 px
  return {
    tx: Math.round(Math.cos(rad) * spread),
    ty: Math.round(Math.sin(rad) * spread * 0.85 + 28), // slight downward gravity bias
    rot: (i % 2 === 0 ? 1 : -1) * (210 + (i % 4) * 85), // alternating CW/CCW spin 210–465°
    flip: i % 3 === 0 ? -1 : 1,                         // every 3rd piece flips over as it travels
    dur: 1.05 + (i % 4) * 0.12,                         // 1.05–1.41 s duration
    delay: (i % 6) * 0.033,                             // 0–0.165 s stagger
    w: 8 + (i % 3) * 4,                                 // 8 / 12 / 16 px width
    h: i % 9 === 0 ? 8 + (i % 3) * 4 : 4 + (i % 2) * 3,// square every 9th, else rectangle
    round: i % 9 === 0,                                  // circle every 9th
  }
})

// Colour palette cycles: full bonus colour, white, 73%-opacity bonus, white, bonus, 87%-opacity bonus
const CONFETTI_PALETTE = (color) => [color, '#ffffff', `${color}bb`, '#ffffff', color, `${color}dd`]

const KEYFRAMES = `
@keyframes bcBackdropIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes bcGlow {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
@keyframes bcCardIn {
  from { opacity: 0; transform: scale(0.6) translateY(48px); }
  55%  { transform: scale(1.06) translateY(-8px); }
  75%  { transform: scale(0.97) translateY(3px); }
  90%  { transform: scale(1.02) translateY(-1px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes bcIconIn {
  0%   { transform: scale(0.1) rotate(-20deg); opacity: 0; }
  55%  { transform: scale(1.28) rotate(12deg); }
  75%  { transform: scale(0.88) rotate(-5deg); }
  88%  { transform: scale(1.08) rotate(2deg); }
  to   { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes bcConfetti {
  0%   { opacity: 1;
         transform: translate(-50%, -50%) translate(0, 0) rotate(0deg) scaleX(1); }
  18%  { transform: translate(-50%, -50%)
                    translate(calc(var(--tx) * 0.35), calc(var(--ty) * 0.35 - 38px))
                    rotate(calc(var(--rot) * 0.14))
                    scaleX(var(--flip)); }
  72%  { opacity: 0.75; }
  100% { opacity: 0;
         transform: translate(-50%, -50%) translate(var(--tx), var(--ty))
                    rotate(var(--rot)) scaleX(var(--flip)); }
}
@keyframes bcShimmer {
  0%        { left: -100%; }
  40%, 100% { left: 150%; }
}
@keyframes bcCountdown {
  from { width: 100%; }
  to   { width: 0%; }
}
@keyframes bcTextIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes bcTitleIn {
  from { opacity: 0; transform: scale(0.88) translateY(6px); letter-spacing: 4px; }
  to   { opacity: 1; transform: scale(1) translateY(0);      letter-spacing: -0.3px; }
}
`

export default function BonusCelebration({ bonusKey, onDismiss }) {
  const info = BONUS_INFO[bonusKey]
  const color = colors[info.colorKey]
  const palette = CONFETTI_PALETTE(color)

  const dismiss = useCallback(() => onDismiss(), [onDismiss])

  useEffect(() => {
    const t = setTimeout(dismiss, DISMISS_MS)
    return () => clearTimeout(t)
  }, [dismiss])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') dismiss() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [dismiss])

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
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        animation: 'bcBackdropIn 0.3s ease',
        cursor: 'pointer',
        padding: '24px',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Breathing spotlight behind card */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 500px 400px at center, ${color}22, transparent 68%)`,
          animation: 'bcGlow 2.8s ease-in-out 0.4s infinite alternate',
          pointerEvents: 'none',
        }}
      />

      {/* Card — no overflow:hidden so confetti can escape into the backdrop */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          background: colors.surface,
          border: `1px solid ${color}44`,
          borderRadius: 32,
          padding: '52px 40px 40px',
          maxWidth: 380,
          width: '100%',
          textAlign: 'center',
          animation: 'bcCardIn 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: `inset 0 1px 0 ${color}22, 0 0 0 1px ${color}18, 0 0 80px ${color}28, 0 40px 100px rgba(0,0,0,0.7)`,
          cursor: 'default',
        }}
      >
        {/* Shimmer sweep — has its own overflow container so it clips correctly */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 32, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '45%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07) 50%, transparent)',
            animation: 'bcShimmer 3.5s ease-in-out 0.9s infinite',
          }} />
        </div>

        {/* Icon area — confetti bursts from here and escapes into the backdrop */}
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>

          {/* Soft ambient glow behind icon */}
          <div style={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}30, transparent 70%)`,
            animation: 'bcGlow 2.2s ease-in-out 0.5s infinite alternate',
          }} />

          {/* Confetti burst — 32 pieces arcing outward from icon centre */}
          {CONFETTI.map((p, i) => (
            <span
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: p.w,
                height: p.round ? p.w : p.h,
                borderRadius: p.round ? '50%' : 2,
                background: palette[i % palette.length],
                animation: `bcConfetti ${p.dur}s linear ${p.delay}s both`,
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
                '--rot': `${p.rot}deg`,
                '--flip': p.flip,
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Icon */}
          <span style={{
            fontSize: 96,
            lineHeight: 1,
            animation: 'bcIconIn 0.85s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both',
            filter: `drop-shadow(0 0 28px ${color}bb)`,
            display: 'block',
            position: 'relative',
            zIndex: 1,
          }}>
            {info.icon}
          </span>
        </div>

        {/* Title */}
        <div style={{
          fontFamily: fonts.display,
          fontSize: 34,
          fontWeight: 700,
          color: color,
          marginBottom: 12,
          letterSpacing: '-0.3px',
          lineHeight: 1.1,
          animation: 'bcTitleIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.45s both',
        }}>
          {HEADLINES[bonusKey]}
        </div>

        {/* Subtext */}
        <div style={{
          fontFamily: fonts.body,
          fontSize: 15,
          color: colors.textMuted,
          lineHeight: 1.6,
          marginBottom: 32,
          animation: 'bcTextIn 0.4s ease 0.6s both',
        }}>
          {SUBTEXT[bonusKey]}
        </div>

        {/* Dismiss hint */}
        <div style={{
          fontFamily: fonts.body,
          fontSize: 11,
          color: colors.textGhost,
          textTransform: 'uppercase',
          letterSpacing: 2,
          animation: 'bcTextIn 0.4s ease 0.75s both',
        }}>
          Tap anywhere to continue
        </div>

        {/* Countdown bar — gradient + glow */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color}66, ${color})`,
          boxShadow: `0 0 10px ${color}88`,
          animation: `bcCountdown ${DISMISS_MS}ms linear forwards`,
          borderRadius: '0 0 0 32px',
        }} />
      </div>
    </div>,
    document.body,
  )
}
