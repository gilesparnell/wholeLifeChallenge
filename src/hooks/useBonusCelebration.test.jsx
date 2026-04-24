// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useBonusCelebration } from './useBonusCelebration'

const makeBonus = (earned) => ({ earned, used: 0, available: earned, streak: 0, threshold: 10 })
const makeBonuses = ({ indulgence = 0, restDay = 0, nightOwl = 0, freeDay = 0 } = {}) => ({
  indulgence: makeBonus(indulgence),
  restDay: makeBonus(restDay),
  nightOwl: makeBonus(nightOwl),
  freeDay: makeBonus(freeDay),
})

describe('useBonusCelebration', () => {
  // ── Bug regression ─────────────────────────────────────────────────────────
  it('does NOT fire celebration when loading=false reveals pre-existing earned bonuses', () => {
    // This is the login bug: on mount, loading=true and bonuses are all 0.
    // When Supabase data arrives, loading=false and bonuses.restDay.earned=1.
    // The hook must NOT treat that as a newly-earned bonus.
    const emptyBonuses = makeBonuses({ restDay: 0 })
    const loadedBonuses = makeBonuses({ restDay: 1 })

    const { result, rerender } = renderHook(
      ({ bonuses, loading }) => useBonusCelebration(bonuses, loading),
      { initialProps: { bonuses: emptyBonuses, loading: true } },
    )

    expect(result.current.currentCelebration).toBeNull()

    // Data loads — bonuses now reflect past-earned state
    rerender({ bonuses: loadedBonuses, loading: false })

    // Must NOT celebrate a bonus earned before we started watching
    expect(result.current.currentCelebration).toBeNull()
  })

  it('does NOT fire celebration when multiple pre-existing bonuses are revealed on load', () => {
    const emptyBonuses = makeBonuses()
    const loadedBonuses = makeBonuses({ indulgence: 2, restDay: 1, nightOwl: 1 })

    const { result, rerender } = renderHook(
      ({ bonuses, loading }) => useBonusCelebration(bonuses, loading),
      { initialProps: { bonuses: emptyBonuses, loading: true } },
    )

    rerender({ bonuses: loadedBonuses, loading: false })

    expect(result.current.currentCelebration).toBeNull()
  })

  // ── Happy path ──────────────────────────────────────────────────────────────
  it('fires celebration when bonus is earned after data is loaded', () => {
    // Simulate: data already loaded, user logs their 10th exercise day
    const initialBonuses = makeBonuses({ restDay: 0 })
    const afterEarn = makeBonuses({ restDay: 1 })

    const { result, rerender } = renderHook(
      ({ bonuses, loading }) => useBonusCelebration(bonuses, loading),
      { initialProps: { bonuses: initialBonuses, loading: false } },
    )

    expect(result.current.currentCelebration).toBeNull()

    rerender({ bonuses: afterEarn, loading: false })

    expect(result.current.currentCelebration).toBe('restDay')
  })

  it('fires the correct bonus key for each bonus type', () => {
    const types = ['indulgence', 'restDay', 'nightOwl', 'freeDay']
    for (const type of types) {
      const initial = makeBonuses()
      const earned = makeBonuses({ [type]: 1 })

      const { result, rerender } = renderHook(
        ({ bonuses, loading }) => useBonusCelebration(bonuses, loading),
        { initialProps: { bonuses: initial, loading: false } },
      )
      rerender({ bonuses: earned, loading: false })
      expect(result.current.currentCelebration).toBe(type)
    }
  })

  // ── Queue behaviour ─────────────────────────────────────────────────────────
  it('queues all bonuses when several are earned simultaneously, showing one at a time', () => {
    const initial = makeBonuses()
    const twoEarned = makeBonuses({ restDay: 1, nightOwl: 1 })

    const { result, rerender } = renderHook(
      ({ bonuses, loading }) => useBonusCelebration(bonuses, loading),
      { initialProps: { bonuses: initial, loading: false } },
    )

    rerender({ bonuses: twoEarned, loading: false })
    expect(result.current.currentCelebration).not.toBeNull()

    act(() => result.current.dismissCelebration())
    expect(result.current.currentCelebration).not.toBeNull()

    act(() => result.current.dismissCelebration())
    expect(result.current.currentCelebration).toBeNull()
  })

  it('dismissCelebration clears currentCelebration', () => {
    const initial = makeBonuses()
    const earned = makeBonuses({ indulgence: 1 })

    const { result, rerender } = renderHook(
      ({ bonuses, loading }) => useBonusCelebration(bonuses, loading),
      { initialProps: { bonuses: initial, loading: false } },
    )

    rerender({ bonuses: earned, loading: false })
    expect(result.current.currentCelebration).toBe('indulgence')

    act(() => result.current.dismissCelebration())
    expect(result.current.currentCelebration).toBeNull()
  })

  // ── Edge cases ──────────────────────────────────────────────────────────────
  it('returns null when no bonuses ever earned', () => {
    const { result } = renderHook(() => useBonusCelebration(makeBonuses(), false))
    expect(result.current.currentCelebration).toBeNull()
  })

  it('does not fire when earned count stays the same', () => {
    const bonuses = makeBonuses({ restDay: 2 })

    const { result, rerender } = renderHook(
      ({ bonuses, loading }) => useBonusCelebration(bonuses, loading),
      { initialProps: { bonuses, loading: false } },
    )

    rerender({ bonuses: makeBonuses({ restDay: 2 }), loading: false })
    expect(result.current.currentCelebration).toBeNull()
  })

  it('fires only once even when earned jumps by more than 1', () => {
    const initial = makeBonuses({ freeDay: 0 })
    const jumped = makeBonuses({ freeDay: 3 })

    const { result, rerender } = renderHook(
      ({ bonuses, loading }) => useBonusCelebration(bonuses, loading),
      { initialProps: { bonuses: initial, loading: false } },
    )

    rerender({ bonuses: jumped, loading: false })
    expect(result.current.currentCelebration).toBe('freeDay')

    act(() => result.current.dismissCelebration())
    // No second celebration for the same type — earned only counts once per change
    expect(result.current.currentCelebration).toBeNull()
  })
})
