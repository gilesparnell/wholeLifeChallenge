// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { detectSwipe, MIN_SWIPE_DISTANCE, createWheelSwipeDetector } from './swipe'

describe('detectSwipe', () => {
  it('returns "left" for a clean right-to-left drag', () => {
    // Finger moves from x=250 to x=100 — 150px leftward, negligible vertical.
    expect(detectSwipe(250, 100, 100, 105)).toBe('left')
  })

  it('returns "right" for a clean left-to-right drag', () => {
    expect(detectSwipe(50, 100, 200, 100)).toBe('right')
  })

  it('returns null when horizontal distance is under the threshold', () => {
    // Below MIN_SWIPE_DISTANCE (50px) — treat as a tap, not a swipe.
    expect(detectSwipe(100, 100, 120, 100)).toBeNull()
    expect(detectSwipe(100, 100, 80, 100)).toBeNull()
  })

  it('returns null for a mostly-vertical drag (avoids hijacking scroll)', () => {
    // 60px horizontal but 200px vertical — user is scrolling, not swiping.
    expect(detectSwipe(100, 100, 160, 300)).toBeNull()
  })

  it('returns a direction when horizontal clearly dominates vertical', () => {
    // 120px horizontal vs 40px vertical — diagonal but horizontal-dominant.
    expect(detectSwipe(200, 100, 80, 140)).toBe('left')
  })

  it('treats an exact threshold-boundary swipe as a swipe', () => {
    // Distance exactly at MIN_SWIPE_DISTANCE should register.
    expect(detectSwipe(0, 0, MIN_SWIPE_DISTANCE, 0)).toBe('right')
  })

  it('returns null for no movement at all', () => {
    expect(detectSwipe(100, 100, 100, 100)).toBeNull()
  })
})

describe('createWheelSwipeDetector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('accumulates a burst of wheel deltas and fires once after quietMs', () => {
    const onSwipe = vi.fn()
    const detector = createWheelSwipeDetector({ onSwipe, quietMs: 120 })

    detector(40, 5)
    detector(30, 2)
    detector(40, 1) // accumulated dx = 110, dy = 8 → right
    expect(onSwipe).not.toHaveBeenCalled()

    vi.advanceTimersByTime(120)
    expect(onSwipe).toHaveBeenCalledTimes(1)
    expect(onSwipe).toHaveBeenCalledWith('right')
  })

  it('fires "left" for a right-to-left trackpad swipe', () => {
    const onSwipe = vi.fn()
    const detector = createWheelSwipeDetector({ onSwipe, quietMs: 100 })
    detector(-60, 0)
    detector(-60, 0)
    vi.advanceTimersByTime(100)
    expect(onSwipe).toHaveBeenCalledWith('left')
  })

  it('does nothing when the burst is mostly vertical (scroll, not swipe)', () => {
    const onSwipe = vi.fn()
    const detector = createWheelSwipeDetector({ onSwipe, quietMs: 100 })
    detector(10, 80)
    detector(15, 120)
    vi.advanceTimersByTime(100)
    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('does nothing when the horizontal accumulation is under the threshold', () => {
    const onSwipe = vi.fn()
    const detector = createWheelSwipeDetector({ onSwipe, quietMs: 100 })
    detector(20, 0)
    detector(20, 0) // total dx = 40 < MIN_SWIPE_DISTANCE (50)
    vi.advanceTimersByTime(100)
    expect(onSwipe).not.toHaveBeenCalled()
  })

  it('re-arms after firing — a second burst after the quiet period fires again', () => {
    const onSwipe = vi.fn()
    const detector = createWheelSwipeDetector({ onSwipe, quietMs: 100 })

    detector(80, 0)
    vi.advanceTimersByTime(100)
    expect(onSwipe).toHaveBeenCalledTimes(1)
    expect(onSwipe).toHaveBeenNthCalledWith(1, 'right')

    detector(-80, 0)
    vi.advanceTimersByTime(100)
    expect(onSwipe).toHaveBeenCalledTimes(2)
    expect(onSwipe).toHaveBeenNthCalledWith(2, 'left')
  })

  it('a new delta inside the quiet window extends the debounce', () => {
    // User is still actively swiping — don't fire mid-gesture.
    const onSwipe = vi.fn()
    const detector = createWheelSwipeDetector({ onSwipe, quietMs: 100 })

    detector(60, 0)
    vi.advanceTimersByTime(80) // not yet
    detector(30, 0) // resets the timer
    vi.advanceTimersByTime(80) // still 20ms shy of the new quiet window
    expect(onSwipe).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20)
    expect(onSwipe).toHaveBeenCalledWith('right')
  })
})
