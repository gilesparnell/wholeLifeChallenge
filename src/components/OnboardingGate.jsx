import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { markOnboardingComplete } from '../lib/profiles'
import OnboardingModal from './OnboardingModal'

const LOCAL_DISMISS_KEY = 'wlc-onboarding-dismissed'

/**
 * Renders the OnboardingModal once for new users. After they finish or skip,
 * the profile row is patched (or localStorage is set for dev users) and the
 * modal stops showing.
 */
export default function OnboardingGate({ children }) {
  const { profile, user } = useAuth()
  const [dismissed, setDismissed] = useState(false)

  // Check localStorage on mount for the dev-user case (no real profile to patch)
  useEffect(() => {
    try {
      if (localStorage.getItem(LOCAL_DISMISS_KEY) === 'true') setDismissed(true)
    } catch {
      // ignore
    }
  }, [])

  const handleComplete = async () => {
    setDismissed(true)
    try {
      localStorage.setItem(LOCAL_DISMISS_KEY, 'true')
    } catch {
      // ignore
    }
    if (profile?.id && !String(profile.id).startsWith('dev-')) {
      await markOnboardingComplete(profile.id)
    }
  }

  const shouldShow = !!user && !dismissed && profile && !profile.onboarding_completed

  return (
    <>
      {children}
      {shouldShow && <OnboardingModal onComplete={handleComplete} />}
    </>
  )
}
