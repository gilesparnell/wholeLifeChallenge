// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { detectNewBonuses } from './bonusCelebration'

const makeBonus = (earned) => ({ earned, used: 0, available: earned, streak: 0, threshold: 10 })

const makeBonuses = ({ indulgence = 0, restDay = 0, nightOwl = 0, freeDay = 0 } = {}) => ({
  indulgence: makeBonus(indulgence),
  restDay: makeBonus(restDay),
  nightOwl: makeBonus(nightOwl),
  freeDay: makeBonus(freeDay),
})

describe('detectNewBonuses', () => {
  it('returns [] when no bonus counts changed', () => {
    const prev = makeBonuses({ restDay: 1 })
    const next = makeBonuses({ restDay: 1 })
    expect(detectNewBonuses(prev, next)).toEqual([])
  })

  it('returns ["restDay"] when restDay.earned increases from 0 to 1', () => {
    const prev = makeBonuses({ restDay: 0 })
    const next = makeBonuses({ restDay: 1 })
    expect(detectNewBonuses(prev, next)).toEqual(['restDay'])
  })

  it('returns ["indulgence"] when indulgence.earned increases', () => {
    const prev = makeBonuses({ indulgence: 2 })
    const next = makeBonuses({ indulgence: 3 })
    expect(detectNewBonuses(prev, next)).toEqual(['indulgence'])
  })

  it('returns ["nightOwl"] when nightOwl.earned increases', () => {
    const prev = makeBonuses({ nightOwl: 0 })
    const next = makeBonuses({ nightOwl: 1 })
    expect(detectNewBonuses(prev, next)).toEqual(['nightOwl'])
  })

  it('returns ["freeDay"] when freeDay.earned increases', () => {
    const prev = makeBonuses({ freeDay: 0 })
    const next = makeBonuses({ freeDay: 1 })
    expect(detectNewBonuses(prev, next)).toEqual(['freeDay'])
  })

  it('returns multiple keys when multiple bonuses earned simultaneously', () => {
    const prev = makeBonuses({ restDay: 1, nightOwl: 2 })
    const next = makeBonuses({ restDay: 2, nightOwl: 3 })
    const result = detectNewBonuses(prev, next)
    expect(result).toContain('restDay')
    expect(result).toContain('nightOwl')
    expect(result).toHaveLength(2)
  })

  it('returns all four keys when all bonuses earned simultaneously', () => {
    const prev = makeBonuses({ indulgence: 0, restDay: 0, nightOwl: 0, freeDay: 0 })
    const next = makeBonuses({ indulgence: 1, restDay: 1, nightOwl: 1, freeDay: 1 })
    const result = detectNewBonuses(prev, next)
    expect(result).toHaveLength(4)
  })

  it('returns [] when prevBonuses is null (initial load — no celebration)', () => {
    const next = makeBonuses({ restDay: 1 })
    expect(detectNewBonuses(null, next)).toEqual([])
  })

  it('returns [] when nextBonuses is null', () => {
    const prev = makeBonuses({ restDay: 1 })
    expect(detectNewBonuses(prev, null)).toEqual([])
  })

  it('returns [] when earned decreases (defensive — should not happen in practice)', () => {
    const prev = makeBonuses({ restDay: 3 })
    const next = makeBonuses({ restDay: 2 })
    expect(detectNewBonuses(prev, next)).toEqual([])
  })

  it('treats missing earned field in prev as 0', () => {
    const prev = { indulgence: {}, restDay: {}, nightOwl: {}, freeDay: {} }
    const next = makeBonuses({ restDay: 1 })
    expect(detectNewBonuses(prev, next)).toEqual(['restDay'])
  })

  it('returns each key at most once even if earned jumps by more than 1', () => {
    const prev = makeBonuses({ freeDay: 0 })
    const next = makeBonuses({ freeDay: 3 })
    const result = detectNewBonuses(prev, next)
    expect(result).toEqual(['freeDay'])
    expect(result).toHaveLength(1)
  })
})
