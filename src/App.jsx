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
import { reportError } from './lib/sentry'
import { registerServiceWorker } from './lib/serviceWorker'
import CheckIn from './pages/CheckIn'
import Journal from './pages/Journal'
import Info from './pages/Info'
import Leaderboard from './pages/Leaderboard'
import NotFound from './pages/NotFound'

// Lazy-load Progress (Recharts is ~600KB) and Admin (admin-only, rarely loaded)
const Progress = lazy(() => import('./pages/Progress'))
const Admin = lazy(() => import('./pages/Admin'))
const Health = lazy(() => import('./pages/Health'))

const PageFallback = () => (
  <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-dim)' }}>
    Loading…
  </div>
)

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
      <UpdateToast visible={updateAvailable} onRefresh={handleRefresh} />
      <BrowserRouter>
        <ThemeProvider>
        <AuthProvider>
          <AuthGate>
            <DataProvider>
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
                    <Route path="/health" element={<Health />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            </Layout>
            </OnboardingGate>
            </DataProvider>
          </AuthGate>
        </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
