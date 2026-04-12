import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { colors, fonts } from '../styles/theme'
import { getDayIndex, getToday, getChallengeDays, getChallengeStartFormatted, getChallengeEndDate } from '../lib/dates'

const NAV_ITEMS = [
  { to: '/', label: 'Check In' },
  { to: '/progress', label: 'Progress' },
  { to: '/journal', label: 'Journal' },
  { to: '/leaderboard', label: 'Board' },
  { to: '/info', label: 'Info' },
  { to: '/admin', label: 'Admin' },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const location = useLocation()
  const today = getToday()
  const dayIndex = getDayIndex(today)

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--color-border-subtle); border-radius: 3px; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .habit-card { transition: all 0.2s ease; }
        .habit-card:hover { transform: translateY(-2px); }
        .habit-card:active { transform: scale(0.97); }
        .nav-btn { transition: all 0.15s ease; }
        .nav-btn:hover { background: var(--color-surface-hover) !important; }
        textarea:focus, input:focus, select:focus { outline: none; border-color: var(--color-accent) !important; }
        .wlc-container { max-width: 480px; margin: 0 auto; padding: 20px 16px 40px; }
        @media (min-width: 768px) {
          .wlc-container { max-width: 720px; padding: 32px 24px 48px; }
          .wlc-stats-row { gap: 12px !important; }
          .wlc-habits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .wlc-habits-grid > * { margin-bottom: 0 !important; }
          .wlc-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .wlc-charts-grid > * { margin-bottom: 0 !important; }
        }
        @media (min-width: 1024px) {
          .wlc-container { max-width: 960px; }
        }
      `}</style>
      <div className="wlc-container" style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        fontFamily: fonts.body,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28, animation: 'fadeUp 0.5s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{
                background: 'none', border: 'none', color: colors.textGhost,
                fontSize: 18, cursor: 'pointer', padding: '2px 4px',
                transition: 'color 0.2s',
              }}
            >
              {resolvedTheme === 'dark' ? '\u2600\uFE0F' : '\u{1F319}'}
            </button>
            {user && (
              <button
                onClick={signOut}
                style={{
                  background: 'none', border: 'none', color: colors.textGhost,
                  fontSize: 12, cursor: 'pointer', fontFamily: fonts.body,
                }}
              >
                Sign out
              </button>
            )}
          </div>
          <p style={{
            fontSize: 12, letterSpacing: 4, textTransform: 'uppercase',
            color: colors.accent, fontWeight: 600, marginBottom: 4,
          }}>
            Whole Life Challenge
          </p>
          <h1 style={{
            fontFamily: fonts.display, fontSize: 32, fontWeight: 300,
            letterSpacing: -0.5, lineHeight: 1.1,
          }}>
            Day {Math.min(Math.max(dayIndex + 1, 1), getChallengeDays())} <span style={{ color: colors.textFaint }}>/ {getChallengeDays()}</span>
          </h1>
          <p style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>{getChallengeStartFormatted()} — {getChallengeEndDate()}</p>
        </div>

        {/* Nav */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 24,
          background: colors.surface, borderRadius: 12, padding: 4,
        }}>
          {NAV_ITEMS.map(({ to, label }) => {
            const isActive = location.pathname === to || (to === '/' && location.pathname === '')
            return (
              <NavLink
                key={to}
                to={to}
                className="nav-btn"
                style={{
                  flex: 1, padding: '10px 0', border: 'none', borderRadius: 10,
                  textDecoration: 'none', textAlign: 'center',
                  fontSize: 12, fontWeight: 600, fontFamily: fonts.body,
                  background: isActive ? colors.surfaceHover : 'transparent',
                  color: isActive ? colors.text : colors.textFaint,
                }}
              >
                {label}
              </NavLink>
            )
          })}
        </div>

        {/* Page content */}
        {children}
      </div>
    </>
  )
}
