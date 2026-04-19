// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { detectSwipe, MIN_SWIPE_DISTANCE } from './swipe'

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
