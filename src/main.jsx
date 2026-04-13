import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initSentry } from './lib/sentry'
import { initAnalytics } from './lib/analytics'
import App from './App.jsx'

// Initialise Sentry + PostHog before React mounts so even the very first
// render errors are captured and the first user actions are tracked.
initSentry()
initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
