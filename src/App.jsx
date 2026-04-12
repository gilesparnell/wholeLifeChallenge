import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import { ThemeProvider } from './contexts/ThemeContext'
import AuthGate from './components/AuthGate'
import Layout from './components/Layout'
import CheckIn from './pages/CheckIn'
import Progress from './pages/Progress'
import Journal from './pages/Journal'
import Info from './pages/Info'
import Admin from './pages/Admin'
import Leaderboard from './pages/Leaderboard'

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <DataProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<CheckIn />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/journal" element={<Journal />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/info" element={<Info />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </Layout>
          </DataProvider>
        </AuthGate>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
