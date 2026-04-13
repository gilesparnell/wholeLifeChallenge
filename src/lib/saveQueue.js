// Tiny background save queue with retry + status notifications.
//
// Wraps async save functions. Tracks pending count, current status, and last
// error. Retries failed saves with exponential backoff. Subscribers are
// notified on every status transition so a status indicator can render
// "Saving…" / "Retrying…" / "Couldn't sync".
//
// Status state machine:
//   idle    → no work in flight, no errors
//   saving  → at least one saveFn is in flight on its first attempt
//   retrying → at least one saveFn has failed at least once and is waiting
//              to retry, or is in flight on a retry attempt
//   error   → all queued saves resolved, but the most recent one exhausted
//              its retries. Cleared by the next successful save.
//
// On success, status returns to idle once pendingCount hits zero. A new
// successful save also clears any prior `error` / `lastError`.

export function createSaveQueue({
  maxRetries = 3,
  baseDelayMs = 1000,
  maxDelayMs = 30000,
} = {}) {
  let pendingCount = 0
  let status = 'idle'
  let lastError = null
  const subscribers = new Set()

  const snapshot = () => ({ status, pendingCount, lastError })

  const notify = () => {
    const snap = snapshot()
    subscribers.forEach((cb) => cb(snap))
  }

  const setStatus = (next) => {
    if (status === next) return
    status = next
    notify()
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms))

  const enqueue = async (saveFn) => {
    pendingCount += 1
    setStatus('saving')

    let attempt = 0
    while (true) {
      try {
        const result = await saveFn()
        if (result && result.success === false) {
          throw new Error(result.error || 'save failed')
        }
        // Success
        pendingCount -= 1
        lastError = null
        if (pendingCount === 0) {
          setStatus('idle')
        }
        notify()
        return { success: true }
      } catch (e) {
        const errMessage = e?.message ?? String(e)
        attempt += 1
        if (attempt > maxRetries) {
          pendingCount -= 1
          lastError = errMessage
          // Only flip to error when the queue has fully drained — otherwise
          // other in-flight saves may still recover.
          if (pendingCount === 0) {
            setStatus('error')
          }
          notify()
          return { success: false, error: errMessage }
        }
        setStatus('retrying')
        const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs)
        await wait(delay)
      }
    }
  }

  const subscribe = (cb) => {
    subscribers.add(cb)
    cb(snapshot())
    return () => {
      subscribers.delete(cb)
    }
  }

  const getStatus = () => snapshot()

  return { enqueue, subscribe, getStatus }
}
