// Swipe-gesture classifier for day navigation on touch devices.
//
// Called from the CheckIn page's onTouchEnd handler with the raw start /
// end coordinates captured on touchStart + touchEnd. Returns:
//
//   'left'  — finger moved right-to-left  → advance to next day
//   'right' — finger moved left-to-right  → go back to previous day
//   null    — movement was too small, or mostly vertical (scroll)
//
// The dominance ratio (horizontal must be ≥ 1.5× vertical) exists so that
// a mostly-vertical scroll doesn't get classified as a diagonal swipe —
// otherwise a user skimming the page could accidentally jump a day.

export const MIN_SWIPE_DISTANCE = 50
export const HORIZONTAL_DOMINANCE_RATIO = 1.5

export function detectSwipe(startX, startY, endX, endY) {
  const dx = endX - startX
  const dy = endY - startY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  if (absDx < MIN_SWIPE_DISTANCE) return null
  if (absDx < absDy * HORIZONTAL_DOMINANCE_RATIO) return null
  return dx > 0 ? 'right' : 'left'
}

// Wheel events (trackpad two-finger swipe, horizontal mouse-wheel) arrive
// as a rapid burst of small deltas rather than a single start/end pair.
// createWheelSwipeDetector coalesces a burst: every delta resets a quiet
// timer, and when the user stops wheeling we hand the total delta to
// detectSwipe. `quietMs` is how long of a pause counts as "gesture over".
export function createWheelSwipeDetector({ onSwipe, quietMs = 120 }) {
  let accX = 0
  let accY = 0
  let timer = null

  const flush = () => {
    const dir = detectSwipe(0, 0, accX, accY)
    accX = 0
    accY = 0
    timer = null
    if (dir) onSwipe(dir)
  }

  return function push(deltaX, deltaY) {
    accX += deltaX
    accY += deltaY
    if (timer) clearTimeout(timer)
    timer = setTimeout(flush, quietMs)
  }
}
