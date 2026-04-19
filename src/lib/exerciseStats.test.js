// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { getWeeklyExerciseMinutes, getActivityTypeBreakdown, getDailyDurationTrend } from './exerciseStats'

const sampleData = {
  '2026-04-12': {
    exercise: { completed: true, type: 'Running', duration_minutes: 30 },
    mobilize: { completed: true, type: 'Yoga', duration_minutes: 20 },
  },
  '2026-04-13': {
    exercise: { completed: true, type: 'Swimming', duration_minutes: 45 },
    mobilize: { completed: true, type: 'Stretching', duration_minutes: 15 },
  },
  '2026-04-14': {
    exercise: { completed: true, type: 'Running', duration_minutes: 30 },
    mobilize: { completed: false, type: '', duration_minutes: null },
  },
  '2026-04-15': {
    exercise: { completed: false, type: '', duration_minutes: null },
    mobilize: { completed: true, type: 'Yoga', duration_minutes: 10 },
  },
}

const allDates = ['2026-04-12', '2026-04-13', '2026-04-14', '2026-04-15',
  '2026-04-16', '2026-04-17', '2026-04-18',
  '2026-04-19', '2026-04-20', '2026-04-21']

describe('getWeeklyExerciseMinutes', () => {
  it('sums exercise and mobilize duration per week', () => {
    const result = getWeeklyExerciseMinutes(sampleData, allDates, 3)
    expect(result).toEqual([
      { week: 'W1', exercise: 105, mobilize: 45, total: 150 },
    ])
  })

  it('returns empty array when no data exists', () => {
    expect(getWeeklyExerciseMinutes({}, allDates, 0)).toEqual([])
  })

  it('treats null duration as 0 minutes', () => {
    const data = {
      '2026-04-12': {
        exercise: { completed: true, type: 'Running', duration_minutes: null },
      },
    }
    const result = getWeeklyExerciseMinutes(data, allDates, 0)
    expect(result[0].exercise).toBe(0)
  })

  it('handles legacy boolean format (no duration)', () => {
    const data = {
      '2026-04-12': { exercise: true, mobilize: true },
    }
    const result = getWeeklyExerciseMinutes(data, allDates, 0)
    expect(result[0].exercise).toBe(0)
    expect(result[0].mobilize).toBe(0)
  })

  it('groups into multiple weeks correctly', () => {
    const twoWeekData = {
      ...sampleData,
      '2026-04-19': {
        exercise: { completed: true, type: 'Weights', duration_minutes: 60 },
        mobilize: { completed: true, type: 'Stretching', duration_minutes: 10 },
      },
    }
    const result = getWeeklyExerciseMinutes(twoWeekData, allDates, 7)
    expect(result).toHaveLength(2)
    expect(result[1].exercise).toBe(60)
    expect(result[1].mobilize).toBe(10)
  })
})

describe('getActivityTypeBreakdown', () => {
  it('returns minutes per exercise type', () => {
    const result = getActivityTypeBreakdown(sampleData, allDates, 3)
    expect(result).toEqual([
      { type: 'Running', minutes: 60 },
      { type: 'Swimming', minutes: 45 },
    ])
  })

  it('sorts by minutes descending', () => {
    const result = getActivityTypeBreakdown(sampleData, allDates, 3)
    expect(result[0].minutes).toBeGreaterThanOrEqual(result[1].minutes)
  })

  it('returns empty array when no exercise data', () => {
    expect(getActivityTypeBreakdown({}, allDates, 0)).toEqual([])
  })

  it('skips entries without duration', () => {
    const data = {
      '2026-04-12': { exercise: { completed: true, type: 'Running', duration_minutes: null } },
    }
    const result = getActivityTypeBreakdown(data, allDates, 0)
    expect(result).toEqual([])
  })
})

describe('multi-entry shape (v0.14.0)', () => {
  it('sums weekly minutes across multi-entry exercise', () => {
    const dates = ['2026-04-13', '2026-04-14']
    const data = {
      '2026-04-13': {
        exercise: {
          completed: true,
          entries: [
            { type: 'Running', duration_minutes: 30 },
            { type: 'Swimming', duration_minutes: 15 },
          ],
        },
        mobilize: { completed: false, entries: [] },
      },
      '2026-04-14': {
        exercise: {
          completed: true,
          entries: [{ type: 'Gym', duration_minutes: 45 }],
        },
        mobilize: { completed: false, entries: [] },
      },
    }
    const result = getWeeklyExerciseMinutes(data, dates, 1)
    expect(result[0].exercise).toBe(90) // 30+15+45
  })

  it('breaks activity types out of multi-entry rows', () => {
    const dates = ['2026-04-13', '2026-04-14']
    const data = {
      '2026-04-13': {
        exercise: {
          completed: true,
          entries: [
            { type: 'Running', duration_minutes: 30 },
            { type: 'Swimming', duration_minutes: 15 },
          ],
        },
      },
      '2026-04-14': {
        exercise: {
          completed: true,
          entries: [
            { type: 'Running', duration_minutes: 20 },
            { type: 'Gym', duration_minutes: 45 },
          ],
        },
      },
    }
    const result = getActivityTypeBreakdown(data, dates, 1)
    const map = Object.fromEntries(result.map((r) => [r.type, r.minutes]))
    expect(map.Running).toBe(50)
    expect(map.Swimming).toBe(15)
    expect(map.Gym).toBe(45)
  })

  it('produces a daily duration total that sums multi-entry exercise', () => {
    const dates = ['2026-04-13']
    const data = {
      '2026-04-13': {
        exercise: {
          completed: true,
          entries: [
            { type: 'Running', duration_minutes: 30 },
            { type: 'Swimming', duration_minutes: 15 },
          ],
        },
        mobilize: { completed: true, entries: [{ type: 'Yoga', duration_minutes: 10 }] },
      },
    }
    const result = getDailyDurationTrend(data, dates, 0)
    expect(result[0].exercise).toBe(45)
    expect(result[0].mobilize).toBe(10)
  })
})

describe('getDailyDurationTrend', () => {
  it('returns daily exercise + mobilize minutes', () => {
    const result = getDailyDurationTrend(sampleData, allDates, 3)
    expect(result).toEqual([
      { day: 1, date: '2026-04-12', exercise: 30, mobilize: 20 },
      { day: 2, date: '2026-04-13', exercise: 45, mobilize: 15 },
      { day: 3, date: '2026-04-14', exercise: 30, mobilize: 0 },
      { day: 4, date: '2026-04-15', exercise: 0, mobilize: 10 },
    ])
  })

  it('returns empty array when no data', () => {
    expect(getDailyDurationTrend({}, [], 0)).toEqual([])
  })

  it('treats missing entries as 0', () => {
    const data = { '2026-04-12': {} }
    const result = getDailyDurationTrend(data, ['2026-04-12'], 0)
    expect(result).toEqual([{ day: 1, date: '2026-04-12', exercise: 0, mobilize: 0 }])
  })
})
