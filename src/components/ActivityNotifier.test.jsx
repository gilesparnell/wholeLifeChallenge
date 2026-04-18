import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import ActivityNotifier from './ActivityNotifier'

// Mutable module-scope mocks so each test can tweak auth state
let mockUser = null
let mockProfile = null
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, profile: mockProfile }),
}))

const showNotificationMock = vi.fn()
const getPermissionMock = vi.fn()
vi.mock('../lib/browserNotifications', () => ({
  isNotificationSupported: () => true,
  getPermission: (...args) => getPermissionMock(...args),
  showNotification: (...args) => showNotificationMock(...args),
}))

// Fake Supabase channel — captures the broadcast listener so tests can
// synchronously fire a payload to it. Hoisted so vi.mock's factory (which
// itself is hoisted to the top of the file) can close over them.
const { channelListeners, fakeChannel, fakeSupabase } = vi.hoisted(() => {
  const channelListeners = new Map()
  const channel = {}
  channel.on = vi.fn((type, filter, cb) => {
    channelListeners.set(`${type}:${filter?.event}`, cb)
    return channel
  })
  channel.subscribe = vi.fn().mockReturnValue(channel)
  channel.unsubscribe = vi.fn().mockResolvedValue('ok')
  const client = {
    channel: vi.fn().mockReturnValue(channel),
  }
  return { channelListeners, fakeChannel: channel, fakeSupabase: client }
})
vi.mock('../lib/supabase', () => ({ supabase: fakeSupabase }))

const fireBroadcast = (payload) => {
  const cb = channelListeners.get('broadcast:activity')
  if (!cb) throw new Error('No broadcast listener registered')
  cb({ event: 'activity', payload })
}

beforeEach(() => {
  vi.clearAllMocks()
  channelListeners.clear()
  mockUser = { id: 'user-123', email: 'test@example.com' }
  mockProfile = { id: 'user-123', preferences: {} }
  getPermissionMock.mockReturnValue('granted')
})

describe('ActivityNotifier', () => {
  it('subscribes to the activity channel when user is signed in and notifications are enabled', () => {
    render(<ActivityNotifier />)
    expect(fakeSupabase.channel).toHaveBeenCalledWith(
      'activity-celebrations',
      expect.objectContaining({
        config: expect.objectContaining({
          broadcast: expect.objectContaining({ self: false }),
        }),
      }),
    )
    expect(fakeChannel.subscribe).toHaveBeenCalledTimes(1)
  })

  it('does NOT subscribe for a local user', () => {
    mockUser = { email: 'local' }
    render(<ActivityNotifier />)
    expect(fakeSupabase.channel).not.toHaveBeenCalled()
  })

  it('does NOT subscribe when no user is signed in', () => {
    mockUser = null
    mockProfile = null
    render(<ActivityNotifier />)
    expect(fakeSupabase.channel).not.toHaveBeenCalled()
  })

  it('does NOT subscribe when the user has opted out', () => {
    mockProfile = { id: 'user-123', preferences: { notificationsEnabled: false } }
    render(<ActivityNotifier />)
    expect(fakeSupabase.channel).not.toHaveBeenCalled()
  })

  it('shows a notification when a valid exercise payload arrives', () => {
    render(<ActivityNotifier />)
    fireBroadcast({
      activity: 'exercise',
      exerciseType: 'Running',
      durationMinutes: 30,
    })
    expect(showNotificationMock).toHaveBeenCalledTimes(1)
    const arg = showNotificationMock.mock.calls[0][0]
    expect(arg.title).toBe('Whole Life Challenge')
    expect(arg.body).toBe('Someone special has just completed 30 min of Running')
    expect(arg.tag).toMatch(/^wlc-activity-exercise-\d{8}$/)
  })

  it('shows a notification with the fixed wellbeing wording', () => {
    render(<ActivityNotifier />)
    fireBroadcast({ activity: 'wellbeing' })
    const arg = showNotificationMock.mock.calls[0][0]
    expect(arg.body).toBe(
      'Someone special has just completed a well-being activity',
    )
  })

  it('does NOT show a notification for an unknown activity', () => {
    render(<ActivityNotifier />)
    fireBroadcast({ activity: 'mobilize' })
    expect(showNotificationMock).not.toHaveBeenCalled()
  })

  it('does NOT show a notification when permission was revoked mid-session', () => {
    render(<ActivityNotifier />)
    getPermissionMock.mockReturnValue('denied')
    fireBroadcast({ activity: 'reflect' })
    expect(showNotificationMock).not.toHaveBeenCalled()
  })

  it('unsubscribes when the component unmounts', () => {
    const { unmount } = render(<ActivityNotifier />)
    unmount()
    expect(fakeChannel.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('re-subscribes when the user toggles off then back on', () => {
    const { rerender } = render(<ActivityNotifier />)
    expect(fakeChannel.subscribe).toHaveBeenCalledTimes(1)

    mockProfile = { id: 'user-123', preferences: { notificationsEnabled: false } }
    rerender(<ActivityNotifier />)
    expect(fakeChannel.unsubscribe).toHaveBeenCalledTimes(1)

    mockProfile = { id: 'user-123', preferences: {} }
    rerender(<ActivityNotifier />)
    expect(fakeChannel.subscribe).toHaveBeenCalledTimes(2)
  })

  it('renders nothing (headless component)', () => {
    const { container } = render(<ActivityNotifier />)
    expect(container.firstChild).toBeNull()
  })
})
