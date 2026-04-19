// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  calculateHabitStreaks,
  calculatePersonalBest,
  calculateConsistency,
  projectCumulative,
  calculateCorrelations,
  calculatePeerDelta,
  calculateRadarWeek,
  calculateHeatmapData,
  calculateStatCards,
  calculateWellnessTrends,
  pearson,
} from './progressMetrics'

const makeDay = (overrides = {}) => ({
  nutrition: 5,
  exercise: { completed: true, type: 'Running', duration_minutes: 30 },
  mobilize: { completed: true, type: 'Stretching', duration_minutes: 10 },
  sleep: { completed: true, hours: 8 },
  hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
  wellbeing: { completed: true, activity_text: 'walk' },
  reflect: { completed: true, reflection_text: 'good day' },
  selfReport: {
    sleepQuality: 4,
    sleepHours: 8,
    energyLevel: 4,
    soreness: 2,
    stressLevel: 2,
    mood: 4,
  },
  bonusApplied: {},
  ...overrides,
})

const makeDates = (n) => {
  const out = []
  const base = new Date('2026-04-13')
  for (let i = 0; i < n; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

const makeData = (entries) => {
  const dates = makeDates(entries.length)
  const data = {}
  dates.forEach((d, i) => {
    if (entries[i] != null) data[d] = entries[i]
  })
  return { data, dates }
}

describe('pearson', () => {
  it('returns 1 for perfectly correlated inputs', () => {
    const r = pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])
    expect(r).toBeCloseTo(1, 5)
  })

  it('returns -1 for perfectly anti-correlated inputs', () => {
    const r = pearson([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])
    expect(r).toBeCloseTo(-1, 5)
  })

  it('returns 0 when one series is constant', () => {
    expect(pearson([1, 1, 1, 1], [1, 2, 3, 4])).toBe(0)
  })

  it('returns null when series have fewer than 2 matched points', () => {
    expect(pearson([1], [2])).toBeNull()
    expect(pearson([], [])).toBeNull()
  })

  it('returns null when series lengths differ', () => {
    expect(pearson([1, 2, 3], [1, 2])).toBeNull()
  })
})

describe('calculateHabitStreaks', () => {
  it('returns a zero streak for every habit when there is no data', () => {
    const result = calculateHabitStreaks({}, [], -1)
    expect(result).toEqual({
      nutrition: 0,
      exercise: 0,
      mobilize: 0,
      sleep: 0,
      hydrate: 0,
      wellbeing: 0,
      reflect: 0,
    })
  })

  it('counts a single completed day as a streak of 1', () => {
    const { data, dates } = makeData([makeDay()])
    const result = calculateHabitStreaks(data, dates, 0)
    expect(result.exercise).toBe(1)
    expect(result.hydrate).toBe(1)
  })

  it('counts consecutive completions correctly', () => {
    const { data, dates } = makeData([makeDay(), makeDay(), makeDay()])
    const result = calculateHabitStreaks(data, dates, 2)
    expect(result.exercise).toBe(3)
    expect(result.sleep).toBe(3)
  })

  it('resets a streak when a habit is missed', () => {
    const { data, dates } = makeData([
      makeDay(),
      makeDay({ exercise: { completed: false } }),
      makeDay(),
    ])
    const result = calculateHabitStreaks(data, dates, 2)
    expect(result.exercise).toBe(1)
    expect(result.sleep).toBe(3)
  })

  it('counts nutrition streak as days with nutrition score >= 3', () => {
    const { data, dates } = makeData([
      makeDay({ nutrition: 5 }),
      makeDay({ nutrition: 4 }),
      makeDay({ nutrition: 2 }), // breaks nutrition streak
      makeDay({ nutrition: 3 }),
    ])
    const result = calculateHabitStreaks(data, dates, 3)
    expect(result.nutrition).toBe(1) // only today counts
  })
})

describe('calculatePersonalBest', () => {
  it('returns null fields when there is no data', () => {
    const result = calculatePersonalBest({}, [], -1)
    expect(result.bestDay).toBeNull()
    expect(result.bestWeek).toBeNull()
  })

  it('finds the highest-scoring day', () => {
    const { data, dates } = makeData([
      makeDay({ nutrition: 3 }), // 3 + 30 = 33
      makeDay({ nutrition: 5 }), // 35
      makeDay({ nutrition: 2 }), // 32
    ])
    const result = calculatePersonalBest(data, dates, 2)
    expect(result.bestDay.dayNumber).toBe(2)
    expect(result.bestDay.score).toBe(35)
    expect(result.bestDay.date).toBe(dates[1])
  })

  it('returns the first day in case of a tie', () => {
    const { data, dates } = makeData([makeDay(), makeDay(), makeDay()])
    const result = calculatePersonalBest(data, dates, 2)
    expect(result.bestDay.dayNumber).toBe(1)
  })

  it('groups by weeks of 7 days and returns the best week', () => {
    // 8 days: week 1 has 7*35=245, week 2 has 1*35=35
    const { data, dates } = makeData(Array(8).fill(null).map(() => makeDay()))
    const result = calculatePersonalBest(data, dates, 7)
    expect(result.bestWeek.weekNumber).toBe(1)
    expect(result.bestWeek.total).toBe(245)
  })
})

describe('calculateConsistency', () => {
  it('returns 0 when there is no data', () => {
    expect(calculateConsistency({}, [], -1)).toBe(0)
  })

  it('returns 100 when every elapsed day has a day entry', () => {
    const { data, dates } = makeData([makeDay(), makeDay(), makeDay()])
    expect(calculateConsistency(data, dates, 2)).toBe(100)
  })

  it('returns the percentage of logged days', () => {
    const { data, dates } = makeData([makeDay(), null, makeDay(), makeDay()])
    // 3 logged / 4 elapsed = 75
    expect(calculateConsistency(data, dates, 3)).toBe(75)
  })

  it('counts a day as logged if any habit has content', () => {
    const minimal = { nutrition: 3 }
    const { data, dates } = makeData([minimal, minimal])
    expect(calculateConsistency(data, dates, 1)).toBe(100)
  })
})

describe('projectCumulative', () => {
  it('returns null projection when there is no data', () => {
    const result = projectCumulative({}, [], -1, 75)
    expect(result.currentTotal).toBe(0)
    expect(result.projectedTotal).toBe(0)
    expect(result.projectedSeries).toEqual([])
  })

  it('projects based on the average score per day so far', () => {
    // 3 perfect days out of 75; avg = 35; projected total = 75 * 35 = 2625
    const { data, dates } = makeData([makeDay(), makeDay(), makeDay()])
    const result = projectCumulative(data, dates, 2, 75)
    expect(result.currentTotal).toBe(105)
    expect(result.projectedTotal).toBe(75 * 35)
  })

  it('does not project past the challenge end', () => {
    const { data, dates } = makeData([makeDay(), makeDay()])
    const result = projectCumulative(data, dates, 1, 75)
    expect(result.projectedSeries.length).toBeLessThanOrEqual(75)
  })

  it('returns a descending-through-time projected series capped at challenge end', () => {
    const { data, dates } = makeData([makeDay(), makeDay(), makeDay()])
    const result = projectCumulative(data, dates, 2, 75)
    const last = result.projectedSeries[result.projectedSeries.length - 1]
    expect(last.day).toBe(75)
    expect(last.projected).toBe(result.projectedTotal)
  })
})

describe('calculateCorrelations', () => {
  it('returns an empty array when there is insufficient data', () => {
    const result = calculateCorrelations({}, [], -1)
    expect(result).toEqual([])
  })

  it('returns an empty array when there are fewer than the minimum sample size', () => {
    const { data, dates } = makeData([makeDay(), makeDay(), makeDay()])
    const result = calculateCorrelations(data, dates, 2)
    expect(result).toEqual([])
  })

  it('surfaces a correlation when sleep and nutrition move together above the minimum sample size', () => {
    // 8 days where sleep hours and nutrition are perfectly correlated
    const entries = [4, 5, 6, 7, 8, 9, 10, 11].map((h, i) =>
      makeDay({
        selfReport: { sleepQuality: 3, sleepHours: h, energyLevel: 3, soreness: 3, stressLevel: 3, mood: 3 },
        nutrition: Math.min(5, Math.max(0, i / 2)),
      })
    )
    const { data, dates } = makeData(entries)
    const result = calculateCorrelations(data, dates, 7)
    const pair = result.find(
      (c) => c.x === 'sleepHours' && c.y === 'nutrition'
    )
    expect(pair).toBeDefined()
    expect(pair.r).toBeGreaterThan(0.3)
    expect(pair.n).toBeGreaterThanOrEqual(7)
  })

  it('sums exercise duration across multi-entry days for correlation calculation', () => {
    // Two scenarios with identical per-day total minutes — one logs 30 min as
    // a single entry, the other splits it across three entries. The correlation
    // pipeline must see the same totals in both cases (and a real, non-undefined
    // result), not just because both fail).
    const singleEntry = Array.from({ length: 8 }, (_, i) =>
      makeDay({
        exercise: { completed: true, entries: [{ type: 'Running', duration_minutes: 10 + i * 5 }] },
        selfReport: { sleepQuality: 3, sleepHours: 7, energyLevel: i, soreness: 3, stressLevel: 3, mood: 3 },
      }),
    )
    const splitEntries = Array.from({ length: 8 }, (_, i) => {
      const total = 10 + i * 5
      const each = total / 3
      return makeDay({
        exercise: {
          completed: true,
          entries: [
            { type: 'Running', duration_minutes: each },
            { type: 'Swimming', duration_minutes: each },
            { type: 'Gym', duration_minutes: each },
          ],
        },
        selfReport: { sleepQuality: 3, sleepHours: 7, energyLevel: i, soreness: 3, stressLevel: 3, mood: 3 },
      })
    })
    const single = makeData(singleEntry)
    const split = makeData(splitEntries)
    const singleResult = calculateCorrelations(single.data, single.dates, 7)
    const splitResult = calculateCorrelations(split.data, split.dates, 7)
    const singlePair = singleResult.find((c) => c.x === 'exerciseMinutes' && c.y === 'energyLevel')
    const splitPair = splitResult.find((c) => c.x === 'exerciseMinutes' && c.y === 'energyLevel')
    // Multi-entry rows must actually produce a correlation, not silently return
    // undefined — that's the regression we're guarding against.
    expect(singlePair).toBeDefined()
    expect(splitPair).toBeDefined()
    expect(splitPair.r).toBeCloseTo(singlePair.r, 6)
    expect(splitPair.n).toBe(singlePair.n)
  })

  it('also sums duration for the legacy single-entry exercise shape', () => {
    // Pre-0.14.0 row shape: { type, duration_minutes } at the top level.
    // Use varying minutes so Pearson r actually computes (no zero variance).
    const legacyDays = Array.from({ length: 8 }, (_, i) =>
      makeDay({
        exercise: { completed: true, type: 'Running', duration_minutes: 10 + i * 5 },
        selfReport: { sleepQuality: 3, sleepHours: 7, energyLevel: i, soreness: 3, stressLevel: 3, mood: 3 },
      }),
    )
    const { data, dates } = makeData(legacyDays)
    const result = calculateCorrelations(data, dates, 7)
    // Legacy rows must still feed the correlation pipeline (regression guard).
    const pair = result.find((c) => c.x === 'exerciseMinutes' && c.y === 'energyLevel')
    expect(pair).toBeDefined()
    expect(pair.n).toBeGreaterThanOrEqual(7)
  })

  it('filters out correlations below the |r| threshold', () => {
    // Random-ish data — unlikely to pass the 0.3 threshold
    const entries = Array.from({ length: 14 }, (_, i) =>
      makeDay({
        nutrition: i % 5,
        selfReport: { sleepQuality: 3, sleepHours: 7, energyLevel: 3, soreness: 3, stressLevel: 3, mood: 3 },
      })
    )
    const { data, dates } = makeData(entries)
    const result = calculateCorrelations(data, dates, 13)
    // All r should have |r| >= 0.3 if any pass
    result.forEach((c) => expect(Math.abs(c.r)).toBeGreaterThanOrEqual(0.3))
  })
})

describe('calculatePeerDelta', () => {
  it('returns an empty array when there is no user cumulative data', () => {
    expect(calculatePeerDelta([], [])).toEqual([])
  })

  it('computes the delta between user and mean peer cumulative at each day', () => {
    const user = [10, 20, 30]
    const peers = [
      [5, 10, 15],
      [15, 30, 45],
    ]
    const result = calculatePeerDelta(user, peers)
    expect(result).toEqual([
      { day: 1, user: 10, peerAvg: 10, delta: 0 },
      { day: 2, user: 20, peerAvg: 20, delta: 0 },
      { day: 3, user: 30, peerAvg: 30, delta: 0 },
    ])
  })

  it('handles peers with shorter histories by using the days they have', () => {
    const user = [10, 20, 30]
    const peers = [[5], [15, 25]]
    const result = calculatePeerDelta(user, peers)
    expect(result[0].peerAvg).toBe(10) // (5 + 15) / 2
    expect(result[1].peerAvg).toBe(25) // only the second peer on day 2
    expect(result[2].peerAvg).toBe(0) // no peer data on day 3
  })

  it('returns zero peer average when there are no peers', () => {
    const user = [10, 20]
    const result = calculatePeerDelta(user, [])
    expect(result[0].peerAvg).toBe(0)
    expect(result[0].delta).toBe(10)
  })
})

describe('calculateRadarWeek', () => {
  it('returns six axes with zero values for an empty week', () => {
    const result = calculateRadarWeek({}, [], 0)
    expect(result).toHaveLength(6)
    expect(result.every((a) => a.value === 0)).toBe(true)
  })

  it('returns six named axes', () => {
    const { data, dates } = makeData([makeDay(), makeDay()])
    const result = calculateRadarWeek(data, dates, 0)
    const axes = result.map((a) => a.axis)
    expect(axes).toEqual([
      'Nutrition',
      'Exercise',
      'Mobilise',
      'Sleep',
      'Hydrate',
      'Wellbeing',
    ])
  })

  it('gives 100 on each habit axis when every day in the week hits that habit', () => {
    const entries = Array(7).fill(null).map(() => makeDay())
    const { data, dates } = makeData(entries)
    const result = calculateRadarWeek(data, dates, 0)
    result.forEach((axis) => expect(axis.value).toBe(100))
  })

  it('ignores days outside the selected week', () => {
    // Day 0-6 are week 0, day 7-13 are week 1
    const entries = Array(14).fill(null).map((_, i) =>
      i < 7 ? makeDay() : makeDay({ exercise: { completed: false } })
    )
    const { data, dates } = makeData(entries)
    const weekTwo = calculateRadarWeek(data, dates, 1)
    const exerciseAxis = weekTwo.find((a) => a.axis === 'Exercise')
    expect(exerciseAxis.value).toBe(0) // nobody exercised in week 2
  })
})

describe('calculateHeatmapData', () => {
  it('returns one entry per challenge day with 0 score for unlogged days', () => {
    const { data, dates } = makeData([makeDay(), null, makeDay()])
    const result = calculateHeatmapData(data, dates, 2, 3)
    expect(result).toHaveLength(3)
    expect(result[0].score).toBe(35)
    expect(result[1].score).toBe(0)
    expect(result[2].score).toBe(35)
  })

  it('pads forward to the challenge length with empty placeholders', () => {
    const { data, dates } = makeData([makeDay()])
    const result = calculateHeatmapData(data, dates, 0, 5)
    expect(result).toHaveLength(5)
    expect(result[4].score).toBe(0)
    expect(result[4].future).toBe(true)
  })

  it('includes an intensity from 0 to 1 based on score / 35', () => {
    const { data, dates } = makeData([makeDay({ nutrition: 0 })])
    const result = calculateHeatmapData(data, dates, 0, 1)
    // score = 30 / 35 = 0.857
    expect(result[0].intensity).toBeCloseTo(30 / 35, 2)
  })
})

describe('calculateStatCards', () => {
  it('returns zero values when there is no data', () => {
    const result = calculateStatCards({}, [], -1, 75)
    expect(result.totalScore).toBe(0)
    expect(result.consistency).toBe(0)
    expect(result.bestWeek).toBeNull()
    expect(result.longestHabitStreak).toEqual({ habit: null, days: 0 })
  })

  it('returns the stat summary for a populated week', () => {
    const { data, dates } = makeData(Array(7).fill(null).map(() => makeDay()))
    const result = calculateStatCards(data, dates, 6, 75)
    expect(result.totalScore).toBe(245)
    expect(result.consistency).toBe(100)
    expect(result.bestWeek.total).toBe(245)
    expect(result.longestHabitStreak.days).toBe(7)
  })
})

describe('calculateWellnessTrends', () => {
  it('returns empty arrays when there is no self-report data', () => {
    const { data, dates } = makeData([makeDay({ selfReport: null })])
    const result = calculateWellnessTrends(data, dates, 0)
    expect(result.mood).toEqual([])
    expect(result.sleepHours).toEqual([])
  })

  it('returns an entry per day where the self-report field is present', () => {
    const { data, dates } = makeData([
      makeDay(),
      makeDay({ selfReport: { ...makeDay().selfReport, mood: 5 } }),
      makeDay({ selfReport: null }),
    ])
    const result = calculateWellnessTrends(data, dates, 2)
    expect(result.mood).toHaveLength(2)
    expect(result.mood[0]).toEqual({ day: 1, date: dates[0], value: 4 })
    expect(result.mood[1]).toEqual({ day: 2, date: dates[1], value: 5 })
  })

  it('extracts sleep hours, energy, stress, and soreness trend arrays', () => {
    const { data, dates } = makeData([makeDay(), makeDay()])
    const result = calculateWellnessTrends(data, dates, 1)
    expect(result.sleepHours).toHaveLength(2)
    expect(result.energyLevel).toHaveLength(2)
    expect(result.stressLevel).toHaveLength(2)
    expect(result.soreness).toHaveLength(2)
  })
})
