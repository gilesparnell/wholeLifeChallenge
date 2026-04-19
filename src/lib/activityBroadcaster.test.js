import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getChannel,
  sendActivity,
  teardown,
  ACTIVITY_CHANNEL_NAME,
  ACTIVITY_BROADCAST_EVENT,
} from './activityBroadcaster'

const makeFakeChannel = () => ({
  send: vi.fn().mockResolvedValue({ status: 'ok' }),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn().mockResolvedValue('ok'),
  on: vi.fn().mockReturnThis(),
})

const makeFakeClient = () => {
  const channel = makeFakeChannel()
  const client = {
    channel: vi.fn().mockReturnValue(channel),
  }
  return { client, channel }
}

describe('activityBroadcaster', () => {
  beforeEach(() => {
    teardown()
  })

  afterEach(() => {
    teardown()
  })

  describe('getChannel', () => {
    it('returns null when client is null', () => {
      expect(getChannel(null)).toBeNull()
      expect(getChannel(undefined)).toBeNull()
    })

    it('creates the channel with the shared name and self:false broadcast config', () => {
      const { client, channel } = makeFakeClient()
      const result = getChannel(client)
      expect(result).toBe(channel)
      expect(client.channel).toHaveBeenCalledWith(
        ACTIVITY_CHANNEL_NAME,
        expect.objectContaining({
          config: expect.objectContaining({
            broadcast: expect.objectContaining({ self: false }),
          }),
        }),
      )
      expect(channel.subscribe).toHaveBeenCalledTimes(1)
    })

    it('reuses the same channel on subsequent calls with the same client', () => {
      const { client } = makeFakeClient()
      const first = getChannel(client)
      const second = getChannel(client)
      expect(first).toBe(second)
      expect(client.channel).toHaveBeenCalledTimes(1)
    })

    it('tears down and recreates when the client changes', () => {
      const { client: clientA, channel: channelA } = makeFakeClient()
      getChannel(clientA)
      const { client: clientB, channel: channelB } = makeFakeClient()
      const result = getChannel(clientB)
      expect(channelA.unsubscribe).toHaveBeenCalledTimes(1)
      expect(result).toBe(channelB)
    })
  })

  describe('sendActivity', () => {
    it('is a no-op when client is null', async () => {
      await expect(sendActivity({ activity: 'exercise' }, null)).resolves.toBeUndefined()
    })

    it('is a no-op when flip is null', async () => {
      const { client, channel } = makeFakeClient()
      await sendActivity(null, client)
      expect(channel.send).not.toHaveBeenCalled()
    })

    it('sends the flip on the shared channel with the activity event', async () => {
      const { client, channel } = makeFakeClient()
      const flip = { activity: 'exercise', exerciseType: 'Running', durationMinutes: 30 }
      await sendActivity(flip, client)
      expect(channel.send).toHaveBeenCalledTimes(1)
      expect(channel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event: ACTIVITY_BROADCAST_EVENT,
        payload: flip,
      })
    })

    it('swallows send errors without throwing', async () => {
      const { client, channel } = makeFakeClient()
      channel.send.mockRejectedValueOnce(new Error('boom'))
      await expect(
        sendActivity({ activity: 'exercise' }, client),
      ).resolves.toBeUndefined()
    })

    it('reuses the same channel across multiple sends', async () => {
      const { client, channel } = makeFakeClient()
      await sendActivity({ activity: 'exercise' }, client)
      await sendActivity({ activity: 'reflect' }, client)
      expect(client.channel).toHaveBeenCalledTimes(1)
      expect(channel.send).toHaveBeenCalledTimes(2)
    })
  })

  describe('teardown', () => {
    it('unsubscribes and forgets the active channel', () => {
      const { client, channel } = makeFakeClient()
      getChannel(client)
      teardown()
      expect(channel.unsubscribe).toHaveBeenCalledTimes(1)
      // After teardown a fresh call recreates the channel
      getChannel(client)
      expect(client.channel).toHaveBeenCalledTimes(2)
    })

    it('is safe to call when nothing has been initialised', () => {
      expect(() => teardown()).not.toThrow()
    })
  })
})
