// Singleton broadcast-channel holder for the "Someone special" activity
// celebrations (v0.12.0). Holds one channel per Supabase client so that
// senders and subscribers share the same wire without subscribing twice.
//
// `config.broadcast.self = false` is the default but set explicitly here
// so a sender never receives their own broadcast.

export const ACTIVITY_CHANNEL_NAME = 'activity-celebrations'
export const ACTIVITY_BROADCAST_EVENT = 'activity'

let activeChannel = null
let activeClient = null

const unsubscribeQuietly = (channel) => {
  if (!channel) return
  try {
    const result = channel.unsubscribe()
    if (result && typeof result.catch === 'function') {
      result.catch(() => {})
    }
  } catch {
    // fire-and-forget
  }
}

export const getChannel = (supabaseClient) => {
  if (!supabaseClient) return null
  if (activeChannel && activeClient === supabaseClient) return activeChannel
  if (activeChannel) {
    unsubscribeQuietly(activeChannel)
    activeChannel = null
  }
  activeClient = supabaseClient
  activeChannel = supabaseClient.channel(ACTIVITY_CHANNEL_NAME, {
    config: { broadcast: { self: false } },
  })
  try {
    activeChannel.subscribe()
  } catch {
    // subscribe failures are silent — sends against an un-subscribed
    // channel will return gracefully and the subscriber effect will
    // retry the next time it mounts.
  }
  return activeChannel
}

export const sendActivity = async (flip, supabaseClient) => {
  if (!supabaseClient || !flip) return
  const channel = getChannel(supabaseClient)
  if (!channel) return
  try {
    await channel.send({
      type: 'broadcast',
      event: ACTIVITY_BROADCAST_EVENT,
      payload: flip,
    })
  } catch {
    // fire-and-forget
  }
}

export const teardown = () => {
  if (activeChannel) {
    unsubscribeQuietly(activeChannel)
  }
  activeChannel = null
  activeClient = null
}
