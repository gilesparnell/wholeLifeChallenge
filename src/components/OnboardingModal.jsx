import { useState } from 'react'
import { colors, fonts } from '../styles/theme'

const SLIDES = [
  {
    icon: '\u{1F44B}',
    title: 'Welcome to the Challenge',
    body: 'The Whole Life Challenge is 75 days of practising the habits that matter most. Each day you score yourself across 7 areas. Small consistent choices, compounded over time.',
  },
  {
    icon: '\u{1F4CA}',
    title: 'How scoring works',
    body: 'Each day is worth 35 points. Start every day with 5 nutrition points and deduct one per non-compliant food. Earn 5 points each for completing exercise, mobilise, sleep, hydrate, well-being, and reflect. Hit 35/35 for a perfect day.',
  },
  {
    icon: '\u{1F381}',
    title: 'Bonuses save your streak',
    body: 'Stay consistent and earn bonuses. Indulgence (4 days of perfect nutrition), Rest Day (10 exercise days), Night Owl (6 sleep days), Free Day (21 near-perfect days). Bonuses auto-apply when you miss a habit so your streak is protected.',
  },
  {
    icon: '\u{1F680}',
    title: 'Ready to start',
    body: 'Tap Check In, fill out today, and you\u2019re away. Visit the Board to opt in to the leaderboard and share your progress with other challengers. Your reflections always stay private.',
  },
]

export default function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState(0)
  const isFirst = step === 0
  const isLast = step === SLIDES.length - 1
  const slide = SLIDES[step]

  const next = () => setStep((s) => Math.min(s + 1, SLIDES.length - 1))
  const back = () => setStep((s) => Math.max(s - 1, 0))
  const finish = () => onComplete?.()

  return (
    <div
      data-testid="onboarding-overlay"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 20,
      }}
    >
      <div
        style={{
          background: colors.surface, borderRadius: 20, padding: '32px 28px',
          maxWidth: 440, width: '100%',
          border: `1px solid ${colors.border}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          animation: 'fadeUp 0.3s ease',
        }}
      >
        {/* Step indicator */}
        <div style={{
          fontSize: 11, color: colors.textFaint,
          textTransform: 'uppercase', letterSpacing: 2,
          textAlign: 'center', marginBottom: 16,
        }}>
          {step + 1} of {SLIDES.length}
        </div>

        {/* Icon */}
        <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>
          {slide.icon}
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: fonts.display, fontSize: 24, fontWeight: 400,
          color: colors.text, textAlign: 'center', marginBottom: 12,
          lineHeight: 1.2,
        }}>
          {slide.title}
        </h2>

        {/* Body */}
        <p style={{
          fontSize: 14, color: colors.textDim, textAlign: 'center',
          lineHeight: 1.6, marginBottom: 24,
        }}>
          {slide.body}
        </p>

        {/* Progress dots */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24,
        }}>
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === step ? 24 : 8, height: 8, borderRadius: 4,
                background: i === step ? colors.accent : colors.borderSubtle,
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!isFirst && (
            <button
              onClick={back}
              style={{
                background: 'transparent', border: `1px solid ${colors.borderSubtle}`,
                borderRadius: 10, padding: '12px 18px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, fontFamily: fonts.body,
                color: colors.textDim,
              }}
            >
              Back
            </button>
          )}
          {!isLast && (
            <button
              onClick={finish}
              style={{
                background: 'transparent', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: colors.textGhost, fontFamily: fonts.body,
                padding: '12px 14px',
              }}
            >
              Skip
            </button>
          )}
          <div style={{ flex: 1 }} />
          {isLast ? (
            <button
              onClick={finish}
              style={{
                background: colors.accent, border: 'none', borderRadius: 10,
                padding: '12px 24px', cursor: 'pointer', color: '#fff',
                fontSize: 14, fontWeight: 700, fontFamily: fonts.body,
              }}
            >
              Get started
            </button>
          ) : (
            <button
              onClick={next}
              style={{
                background: colors.accent, border: 'none', borderRadius: 10,
                padding: '12px 24px', cursor: 'pointer', color: '#fff',
                fontSize: 14, fontWeight: 700, fontFamily: fonts.body,
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
