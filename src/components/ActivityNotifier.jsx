import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { composeMessage, tagFor } from '../lib/activityNotifications'
import {
  getPermission,
  showNotification,
  isNotificationSupported,
} from '../lib/browserNotifications'
import {
  ACTIVITY_CHANNEL_NAME,
  ACTIVITY_BROADCAST_EVENT,
} from '../lib/activityBroadcaster'
import { getToday } from '../lib/dates'

// Headless component mounted at App level. Subscribes to the shared
// activity-celebrations broadcast channel whenever the current user is
// a signed-in whitelisted user who has not opted out, and shows a
// browser notification for every valid broadcast it receives.
//
// Permission is checked at despatch time too — the user can revoke it
// mid-session via browser settings, in which case we drop the message
// silently rather than try to show a notification that will fail.
export default function ActivityNotifier() {
  const { user, profile } = useAuth()
  const isLocal = !user?.id || user?.email === 'local'
  const enabled = profile?.preferences?.notificationsEnabled !== false

  useEffect(() => {
    if (isLocal || !supabase || !user || !enabled) return undefined

    const channel = supabase.channel(ACTIVITY_CHANNEL_NAME, {
      config: { broadcast: { self: false } },
    })

    channel.on(
      'broadcast',
      { event: ACTIVITY_BROADCAST_EVENT },
      ({ payload }) => {
        if (!isNotificationSupported()) return
        if (getPermission() !== 'granted') return
        const msg = composeMessage(payload)
        if (!msg) return
        showNotification({
          ...msg,
          tag: tagFor(payload, getToday()),
        })
      },
    )

    channel.subscribe()

    return () => {
      try {
        const result = channel.unsubscribe()
        if (result && typeof result.catch === 'function') {
          result.catch(() => {})
        }
      } catch {
        // fire-and-forget
      }
    }
  }, [user?.id, isLocal, enabled])

  return null
}
