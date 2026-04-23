import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AuthGate from './components/AuthGate'
import OnboardingGate from './components/OnboardingGate'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import UpdateToast from './components/UpdateToast'
import ActivityNotifier from './components/ActivityNotifier'
import { reportError } from './lib/sentry'
import { registerServiceWorker } from './lib/serviceWorker'
import { CHANGELOG_TEXT } from './lib/changelogContent'
import { getLatestWhatsNew } from './lib/getLatestWhatsNew'
import CheckIn from './pages/CheckIn'
import Journal from './pages/Journal'
import Info from './pages/Info'
import Leaderboard from './pages/Leaderboard'
import NotFound from './pages/NotFound'

// Lazy-load Progress (Recharts is ~600KB) and Admin (admin-only, rarely loaded)
const Progress = lazy(() => import('./pages/Progress'))
const Admin = lazy(() => import('./pages/Admin'))
const Health = lazy(() => import('./pages/Health'))
const Changelog = lazy(() => import('./pages/Changelog'))
const MyPreferences = lazy(() => import('./pages/MyPreferences'))

const PageFallback = () => (
  <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-dim)' }}>
    Loading…
  </div>
)

// Computed once at module load — the bundle is rebuilt every deploy so the
// changelog text always matches the version about to be served.
const LATEST_WHATS_NEW = getLatestWhatsNew(CHANGELOG_TEXT)

function App() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    registerServiceWorker({
      onUpdateAvailable: () => setUpdateAvailable(true),
    })
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <ErrorBoundary onError={reportError}>
      <UpdateToast
        visible={updateAvailable}
        onRefresh={handleRefresh}
        summary={LATEST_WHATS_NEW}
      />
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              {/* Public routes — readable without signing in. Changelog
                  is a release-notes page with zero PII and we link to it
                  from the update toast, so deep links must work for
                  unauthenticated visitors (e.g. customer support links).
                  /health is a diagnostics page that shouldn't require
                  auth either. */}
              <Route
                path="/changelog"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Changelog />
                  </Suspense>
                }
              />
              <Route
                path="/health"
                element={
                  <Suspense fallback={<PageFallback />}>
                    <Health />
                  </Suspense>
                }
              />
              {/* Everything else is behind AuthGate. */}
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

function AuthenticatedApp() {
  return (
    <AuthGate>
      <DataProvider>
        <ActivityNotifier />
        <OnboardingGate>
          <Layout>
            <ErrorBoundary onError={reportError}>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<CheckIn />} />
                  <Route path="/progress" element={<Progress />} />
                  <Route path="/journal" element={<Journal />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/info" element={<Info />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/preferences" element={<MyPreferences />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Layout>
        </OnboardingGate>
      </DataProvider>
    </AuthGate>
  )
}

export default App
