import { NavLink, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { colors, fonts } from '../styles/theme'
import { getDayIndex, getToday, getChallengeDays, getChallengeStartFormatted, getChallengeEndDate } from '../lib/dates'
import SaveStatusIndicator from './SaveStatusIndicator'
import HeaderMenu from './HeaderMenu'
import { getDisplayVersion } from '../lib/version'

const NAV_ITEMS = [
  { to: '/', label: 'Check In' },
  { to: '/progress', label: 'Progress' },
  { to: '/journal', label: 'Journal' },
  { to: '/leaderboard', label: 'Leader Board' },
  { to: '/info', label: 'Info' },
]

export default function Layout({ children }) {
  const { user, signOut, isAdmin } = useAuth()
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
        /*
         * Safe-area insets push the app content below the iOS status bar
         * (clock/signal/wifi/battery) when running as an installed PWA in
         * standalone mode with apple-mobile-web-app-status-bar-style set
         * to black-translucent. Without this padding, the iOS status bar
         * overlays the top of the page and obscures the header buttons.
         * env(safe-area-inset-*) returns 0 in regular Safari and on
         * desktop, so it's safe to apply universally.
         */
        .wlc-container {
          max-width: 480px;
          margin: 0 auto;
          padding-top: calc(20px + env(safe-area-inset-top));
          padding-right: calc(16px + env(safe-area-inset-right));
          padding-bottom: calc(40px + env(safe-area-inset-bottom));
          padding-left: calc(16px + env(safe-area-inset-left));
        }
        .wlc-selfreport-grid { display: flex; flex-direction: column; gap: 10px; }
        .wlc-selfreport-row { display: flex; align-items: center; gap: 8px; }
        .wlc-selfreport-label { font-size: 12px; color: var(--color-text-dim); flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; }
        .wlc-selfreport-scale { display: flex; gap: 4px; flex-shrink: 0; }
        @media (min-width: 768px) {
          .wlc-container {
            max-width: 720px;
            padding-top: calc(32px + env(safe-area-inset-top));
            padding-right: calc(24px + env(safe-area-inset-right));
            padding-bottom: calc(48px + env(safe-area-inset-bottom));
            padding-left: calc(24px + env(safe-area-inset-left));
          }
          .wlc-stats-row { gap: 12px !important; }
          .wlc-habits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .wlc-habits-grid > * { margin-bottom: 0 !important; }
          .wlc-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .wlc-charts-grid > * { margin-bottom: 0 !important; }
          .wlc-selfreport-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
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
            <HeaderMenu
              isAdmin={isAdmin}
              theme={resolvedTheme}
              onToggleTheme={toggleTheme}
              onSignOut={signOut}
              signedIn={!!user}
            />
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
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
            <SaveStatusIndicator />
          </div>
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

        <div style={{
          marginTop: 32,
          paddingTop: 16,
          borderTop: `1px solid ${colors.borderSubtle}`,
          textAlign: 'center',
        }}>
          <Link
            to="/changelog"
            aria-label="View changelog"
            style={{
              fontSize: 10,
              color: colors.textFaint,
              letterSpacing: 0.5,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              textDecoration: 'none',
            }}
          >
            {getDisplayVersion()}
          </Link>
        </div>
      </div>
    </>
  )
}
