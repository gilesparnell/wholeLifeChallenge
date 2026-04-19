// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSaveQueue } from './saveQueue'

describe('createSaveQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('initial status is idle with 0 pending', () => {
    const q = createSaveQueue()
    expect(q.getStatus()).toEqual({ status: 'idle', pendingCount: 0, lastError: null })
  })

  it('calls the saveFn when enqueued', async () => {
    const q = createSaveQueue()
    const saveFn = vi.fn().mockResolvedValue({ success: true })
    const promise = q.enqueue(saveFn)
    await vi.runAllTimersAsync()
    await promise
    expect(saveFn).toHaveBeenCalledTimes(1)
  })

  it('transitions to saving while in flight, then idle on success', async () => {
    const q = createSaveQueue()
    const updates = []
    q.subscribe((s) => updates.push(s.status))
    let resolveSave
    const saveFn = () => new Promise((r) => { resolveSave = r })
    const promise = q.enqueue(saveFn)
    expect(q.getStatus().status).toBe('saving')
    expect(q.getStatus().pendingCount).toBe(1)
    resolveSave({ success: true })
    await vi.runAllTimersAsync()
    await promise
    expect(q.getStatus()).toEqual({ status: 'idle', pendingCount: 0, lastError: null })
    expect(updates).toContain('saving')
    expect(updates).toContain('idle')
  })

  it('retries on failure with exponential backoff and succeeds before exhausting retries', async () => {
    const q = createSaveQueue({ maxRetries: 3, baseDelayMs: 100 })
    let calls = 0
    const saveFn = vi.fn(async () => {
      calls++
      if (calls < 3) return { success: false, error: 'transient' }
      return { success: true }
    })
    const promise = q.enqueue(saveFn)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result).toEqual({ success: true })
    expect(saveFn).toHaveBeenCalledTimes(3)
    expect(q.getStatus()).toEqual({ status: 'idle', pendingCount: 0, lastError: null })
  })

  it('emits retrying status between failed attempts', async () => {
    const q = createSaveQueue({ maxRetries: 2, baseDelayMs: 50 })
    const seen = new Set()
    q.subscribe((s) => seen.add(s.status))
    let calls = 0
    const saveFn = async () => {
      calls++
      if (calls === 1) return { success: false, error: 'first fail' }
      return { success: true }
    }
    const promise = q.enqueue(saveFn)
    await vi.runAllTimersAsync()
    await promise
    expect(seen.has('retrying')).toBe(true)
  })

  it('exhausts retries and ends in error state with lastError set', async () => {
    const q = createSaveQueue({ maxRetries: 2, baseDelayMs: 10 })
    const saveFn = vi.fn().mockResolvedValue({ success: false, error: 'permanent fail' })
    const promise = q.enqueue(saveFn)
    await vi.runAllTimersAsync()
    const result = await promise
    expect(result.success).toBe(false)
    // 1 initial attempt + maxRetries retries = 3 total
    expect(saveFn).toHaveBeenCalledTimes(3)
    const status = q.getStatus()
    expect(status.status).toBe('error')
    expect(status.pendingCount).toBe(0)
    expect(status.lastError).toBe('permanent fail')
  })

  it('thrown errors are treated the same as { success: false }', async () => {
    const q = createSaveQueue({ maxRetries: 1, baseDelayMs: 10 })
    const saveFn = vi.fn().mockRejectedValue(new Error('network down'))
    const promise = q.enqueue(saveFn)
    await vi.runAllTimersAsync()
    await promise
    const status = q.getStatus()
    expect(status.status).toBe('error')
    expect(status.lastError).toBe('network down')
  })

  it('a successful enqueue clears a previous error state', async () => {
    const q = createSaveQueue({ maxRetries: 1, baseDelayMs: 10 })
    // First enqueue fails permanently
    const failFn = vi.fn().mockResolvedValue({ success: false, error: 'oops' })
    const p1 = q.enqueue(failFn)
    await vi.runAllTimersAsync()
    await p1
    expect(q.getStatus().status).toBe('error')

    // Second enqueue succeeds — error should clear
    const okFn = vi.fn().mockResolvedValue({ success: true })
    const p2 = q.enqueue(okFn)
    await vi.runAllTimersAsync()
    await p2
    expect(q.getStatus()).toEqual({ status: 'idle', pendingCount: 0, lastError: null })
  })

  it('subscribe calls back immediately with current status, and on every change', async () => {
    const q = createSaveQueue()
    const cb = vi.fn()
    q.subscribe(cb)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenLastCalledWith({ status: 'idle', pendingCount: 0, lastError: null })

    const promise = q.enqueue(() => Promise.resolve({ success: true }))
    await vi.runAllTimersAsync()
    await promise

    // At minimum: idle → saving → idle = 3 calls
    expect(cb.mock.calls.length).toBeGreaterThanOrEqual(3)
  })

  it('subscribe returns an unsubscribe function', async () => {
    const q = createSaveQueue()
    const cb = vi.fn()
    const unsubscribe = q.subscribe(cb)
    cb.mockClear()
    unsubscribe()

    const promise = q.enqueue(() => Promise.resolve({ success: true }))
    await vi.runAllTimersAsync()
    await promise

    expect(cb).not.toHaveBeenCalled()
  })

  it('processes concurrent enqueues without losing pendingCount', async () => {
    const q = createSaveQueue()
    const p1 = q.enqueue(() => Promise.resolve({ success: true }))
    const p2 = q.enqueue(() => Promise.resolve({ success: true }))
    expect(q.getStatus().pendingCount).toBe(2)
    await vi.runAllTimersAsync()
    await Promise.all([p1, p2])
    expect(q.getStatus()).toEqual({ status: 'idle', pendingCount: 0, lastError: null })
  })
})
