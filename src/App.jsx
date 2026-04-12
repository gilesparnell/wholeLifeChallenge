import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AuthGate from './components/AuthGate'
import OnboardingGate from './components/OnboardingGate'
import Layout from './components/Layout'
import CheckIn from './pages/CheckIn'
import Journal from './pages/Journal'
import Info from './pages/Info'
import Leaderboard from './pages/Leaderboard'

// Lazy-load Progress (Recharts is ~600KB) and Admin (admin-only, rarely loaded)
const Progress = lazy(() => import('./pages/Progress'))
const Admin = lazy(() => import('./pages/Admin'))

const PageFallback = () => (
  <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-dim)' }}>
    Loading…
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <DataProvider>
          <OnboardingGate>
          <Layout>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<CheckIn />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/journal" element={<Journal />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/info" element={<Info />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </Suspense>
          </Layout>
          </OnboardingGate>
          </DataProvider>
        </AuthGate>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
