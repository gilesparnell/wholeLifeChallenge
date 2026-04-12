import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initSentry } from './lib/sentry'
import App from './App.jsx'

// Initialise Sentry before React mounts so even the very first render
// errors are captured.
initSentry()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
