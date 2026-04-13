import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { colors, fonts } from '../styles/theme'
import { getChallengeDays, getChallengeStartFormatted, getChallengeEndDate } from '../lib/dates'

const IS_DEV = import.meta.env.DEV

export default function AuthGate({ children }) {
  const { user, loading, sessionExpired, signIn, signInAsDev } = useAuth()
  const [devEmail, setDevEmail] = useState('giles@parnellsystems.com')

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: colors.bg, color: colors.text,
      }}>
        <p style={{ fontFamily: fonts.display, fontSize: 20 }}>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', background: colors.bg, color: colors.text,
        fontFamily: fonts.body, padding: '20px 16px', gap: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontSize: 12, letterSpacing: 4, textTransform: 'uppercase',
            color: colors.accent, fontWeight: 600, marginBottom: 4,
          }}>
            Whole Life Challenge
          </p>
          <h1 style={{
            fontFamily: fonts.display, fontSize: 32, fontWeight: 300,
            letterSpacing: -0.5, lineHeight: 1.1, margin: '8px 0',
          }}>
            {getChallengeDays()} Days of Change
          </h1>
          <p style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>
            {getChallengeStartFormatted()} — {getChallengeEndDate()}
          </p>
        </div>

        {sessionExpired && (
          <div
            role="status"
            style={{
              maxWidth: 320,
              padding: '12px 16px',
              borderRadius: 10,
              background: 'rgba(232, 163, 74, 0.12)',
              border: `1px solid rgba(232, 163, 74, 0.35)`,
              color: colors.orange,
              fontSize: 13,
              lineHeight: 1.4,
              textAlign: 'center',
            }}
          >
            Your session expired. Sign in again to keep saving your check-ins.
          </div>
        )}

        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={signIn}
            style={{
              background: '#fff', color: '#333', border: 'none', borderRadius: 12,
              padding: '14px 24px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
              fontFamily: fonts.body, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
              <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 2.58z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>

          {IS_DEV && (
            <>
              <div style={{ position: 'relative', marginTop: 4 }}>
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                }}>
                  <div style={{ width: '100%', borderTop: `1px solid ${colors.borderSubtle}` }} />
                </div>
                <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', fontSize: 10 }}>
                  <span style={{
                    background: colors.bg, padding: '0 8px',
                    color: colors.textGhost, letterSpacing: 2, textTransform: 'uppercase',
                  }}>
                    Dev only
                  </span>
                </div>
              </div>

              <input
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="you@example.com"
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  color: colors.text,
                  fontSize: 13,
                  fontFamily: fonts.body,
                  width: '100%',
                }}
              />

              <button
                onClick={() => devEmail.trim() && signInAsDev(devEmail.trim())}
                disabled={!devEmail.trim()}
                style={{
                  background: 'rgba(232, 163, 74, 0.12)',
                  color: colors.orange,
                  border: `1px solid rgba(232, 163, 74, 0.35)`,
                  borderRadius: 10,
                  padding: '12px 24px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  width: '100%',
                }}
              >
                Dev Login
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return children
}
