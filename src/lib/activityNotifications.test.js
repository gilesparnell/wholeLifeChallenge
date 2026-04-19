// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  detectActivityFlips,
  composeMessage,
  tagFor,
  NOTIFICATION_TAG_PREFIX,
  NOTIFICATION_TITLE,
} from './activityNotifications'

const falseBase = {
  exercise: { completed: false, type: '', duration_minutes: null },
  wellbeing: { completed: false, activity_text: '' },
  reflect: { completed: false, reflection_text: '' },
  hydrate: { completed: false, current_ml: 0, target_ml: 2000 },
}

describe('detectActivityFlips', () => {
  it('returns a flip when exercise goes false->true with type and duration', () => {
    const prev = { ...falseBase }
    const next = {
      ...falseBase,
      exercise: { completed: true, type: 'Running', duration_minutes: 30 },
    }
    expect(detectActivityFlips(prev, next)).toEqual([
      { activity: 'exercise', exerciseType: 'Running', durationMinutes: 30 },
    ])
  })

  it('returns a flip without duration when only type is set', () => {
    const next = {
      ...falseBase,
      exercise: { completed: true, type: 'Yoga', duration_minutes: null },
    }
    expect(detectActivityFlips(falseBase, next)).toEqual([
      { activity: 'exercise', exerciseType: 'Yoga' },
    ])
  })

  it('returns a flip with no type and no duration when both are missing', () => {
    const next = {
      ...falseBase,
      exercise: { completed: true, type: '', duration_minutes: null },
    }
    expect(detectActivityFlips(falseBase, next)).toEqual([
      { activity: 'exercise' },
    ])
  })

  it('returns no flip when exercise stays true between saves', () => {
    const prev = {
      ...falseBase,
      exercise: { completed: true, type: 'Running', duration_minutes: 30 },
    }
    const next = {
      ...falseBase,
      exercise: { completed: true, type: 'Running', duration_minutes: 45 },
    }
    expect(detectActivityFlips(prev, next)).toEqual([])
  })

  it('returns no flip when exercise reverts from true to false', () => {
    const prev = {
      ...falseBase,
      exercise: { completed: true, type: 'Running', duration_minutes: 30 },
    }
    expect(detectActivityFlips(prev, falseBase)).toEqual([])
  })

  it('returns a wellbeing flip without the activity_text', () => {
    const next = {
      ...falseBase,
      wellbeing: { completed: true, activity_text: 'walked the dog' },
    }
    const flips = detectActivityFlips(falseBase, next)
    expect(flips).toEqual([{ activity: 'wellbeing' }])
    expect(JSON.stringify(flips)).not.toContain('walked the dog')
  })

  it('returns a reflect flip without the reflection_text', () => {
    const next = {
      ...falseBase,
      reflect: { completed: true, reflection_text: 'felt tired today' },
    }
    const flips = detectActivityFlips(falseBase, next)
    expect(flips).toEqual([{ activity: 'reflect' }])
    expect(JSON.stringify(flips)).not.toContain('felt tired today')
  })

  it('returns a hydrate flip when current_ml crosses the target', () => {
    const prev = {
      ...falseBase,
      hydrate: { completed: false, current_ml: 1750, target_ml: 2000 },
    }
    const next = {
      ...falseBase,
      hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
    }
    expect(detectActivityFlips(prev, next)).toEqual([{ activity: 'hydrate' }])
  })

  it('returns no hydrate flip when current_ml keeps climbing past target', () => {
    const prev = {
      ...falseBase,
      hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
    }
    const next = {
      ...falseBase,
      hydrate: { completed: true, current_ml: 2250, target_ml: 2000 },
    }
    expect(detectActivityFlips(prev, next)).toEqual([])
  })

  it('treats undefined prev as all-false (first save of the day fires flips)', () => {
    const next = {
      ...falseBase,
      exercise: { completed: true, type: 'Cycling', duration_minutes: 45 },
      reflect: { completed: true, reflection_text: 'x' },
    }
    const flips = detectActivityFlips(undefined, next)
    expect(flips).toEqual([
      { activity: 'exercise', exerciseType: 'Cycling', durationMinutes: 45 },
      { activity: 'reflect' },
    ])
  })

  it('treats null prev the same as undefined', () => {
    const next = {
      ...falseBase,
      wellbeing: { completed: true, activity_text: 'x' },
    }
    expect(detectActivityFlips(null, next)).toEqual([{ activity: 'wellbeing' }])
  })

  it('returns flips in a stable order: exercise, wellbeing, reflect, hydrate', () => {
    const next = {
      ...falseBase,
      hydrate: { completed: true, current_ml: 2000, target_ml: 2000 },
      reflect: { completed: true, reflection_text: 'x' },
      wellbeing: { completed: true, activity_text: 'x' },
      exercise: { completed: true, type: 'Running', duration_minutes: 15 },
    }
    const flips = detectActivityFlips(falseBase, next)
    expect(flips.map((f) => f.activity)).toEqual([
      'exercise',
      'wellbeing',
      'reflect',
      'hydrate',
    ])
  })

  it('ignores activities that are not in the watched set (e.g. mobilize, sleep)', () => {
    const prev = {
      ...falseBase,
      mobilize: { completed: false },
      sleep: { completed: false },
    }
    const next = {
      ...falseBase,
      mobilize: { completed: true, type: 'Yoga', duration_minutes: 20 },
      sleep: { completed: true, hours: 8 },
    }
    expect(detectActivityFlips(prev, next)).toEqual([])
  })

  it('returns an empty array when nothing changed', () => {
    expect(detectActivityFlips(falseBase, falseBase)).toEqual([])
  })

  it('tolerates next === undefined gracefully', () => {
    expect(detectActivityFlips(falseBase, undefined)).toEqual([])
  })

  it('tolerates missing sub-fields without throwing', () => {
    const prev = {}
    const next = {
      exercise: { completed: true, type: 'Running' },
    }
    expect(() => detectActivityFlips(prev, next)).not.toThrow()
    expect(detectActivityFlips(prev, next)).toEqual([
      { activity: 'exercise', exerciseType: 'Running' },
    ])
  })

  describe('multi-entry exercise (v0.14.0)', () => {
    it('reads the first entry from the entries array', () => {
      const next = {
        ...falseBase,
        exercise: {
          completed: true,
          entries: [
            { type: 'Swimming', duration_minutes: 20 },
            { type: 'Running', duration_minutes: 30 },
          ],
        },
      }
      expect(detectActivityFlips(falseBase, next)).toEqual([
        { activity: 'exercise', exerciseType: 'Swimming', durationMinutes: 20 },
      ])
    })

    it('returns no flip when entries is empty (completed false → false)', () => {
      const next = {
        ...falseBase,
        exercise: { completed: false, entries: [] },
      }
      expect(detectActivityFlips(falseBase, next)).toEqual([])
    })

    it('still reads the legacy single-entry shape', () => {
      const next = {
        ...falseBase,
        exercise: { completed: true, type: 'Running', duration_minutes: 30 },
      }
      expect(detectActivityFlips(falseBase, next)).toEqual([
        { activity: 'exercise', exerciseType: 'Running', durationMinutes: 30 },
      ])
    })

    it('drops duration when the first entry has no duration_minutes', () => {
      const next = {
        ...falseBase,
        exercise: {
          completed: true,
          entries: [{ type: 'Yoga', duration_minutes: null }],
        },
      }
      expect(detectActivityFlips(falseBase, next)).toEqual([
        { activity: 'exercise', exerciseType: 'Yoga' },
      ])
    })

    it('does not fire a second flip when adding a second entry to an already-completed day', () => {
      const prev = {
        ...falseBase,
        exercise: {
          completed: true,
          entries: [{ type: 'Running', duration_minutes: 30 }],
        },
      }
      const next = {
        ...falseBase,
        exercise: {
          completed: true,
          entries: [
            { type: 'Running', duration_minutes: 30 },
            { type: 'Swimming', duration_minutes: 15 },
          ],
        },
      }
      expect(detectActivityFlips(prev, next)).toEqual([])
    })
  })
})

describe('composeMessage', () => {
  it('composes an exercise message with duration and type', () => {
    const msg = composeMessage({
      activity: 'exercise',
      exerciseType: 'Running',
      durationMinutes: 30,
    })
    expect(msg).toEqual({
      title: NOTIFICATION_TITLE,
      body: 'Someone special has just completed 30 min of Running',
    })
  })

  it('composes an exercise message with type but no duration', () => {
    const msg = composeMessage({ activity: 'exercise', exerciseType: 'Yoga' })
    expect(msg.body).toBe('Someone special has just completed Yoga')
  })

  it('composes a generic exercise message when type and duration are missing', () => {
    const msg = composeMessage({ activity: 'exercise' })
    expect(msg.body).toBe('Someone special has just completed an exercise')
  })

  it('composes a wellbeing message without leaking any activity_text', () => {
    const msg = composeMessage({ activity: 'wellbeing' })
    expect(msg.body).toBe(
      'Someone special has just completed a well-being activity',
    )
  })

  it('composes a reflect message without leaking any reflection_text', () => {
    const msg = composeMessage({ activity: 'reflect' })
    expect(msg.body).toBe(
      'Someone special has just completed their daily reflection',
    )
  })

  it('composes a hydrate message', () => {
    const msg = composeMessage({ activity: 'hydrate' })
    expect(msg.body).toBe('Someone special has just hit their hydration target')
  })

  it('returns null for an unknown activity', () => {
    expect(composeMessage({ activity: 'mobilize' })).toBeNull()
    expect(composeMessage({ activity: 'sleep' })).toBeNull()
    expect(composeMessage({})).toBeNull()
    expect(composeMessage(null)).toBeNull()
    expect(composeMessage(undefined)).toBeNull()
  })

  it('uses the configured notification title', () => {
    expect(NOTIFICATION_TITLE).toBeTypeOf('string')
    expect(NOTIFICATION_TITLE.length).toBeGreaterThan(0)
  })
})

describe('tagFor', () => {
  it('returns a stable tag for the same activity and date', () => {
    expect(tagFor({ activity: 'exercise' }, '2026-04-19')).toBe(
      tagFor({ activity: 'exercise' }, '2026-04-19'),
    )
  })

  it('differs when the activity changes', () => {
    expect(tagFor({ activity: 'exercise' }, '2026-04-19')).not.toBe(
      tagFor({ activity: 'reflect' }, '2026-04-19'),
    )
  })

  it('differs when the date changes', () => {
    expect(tagFor({ activity: 'exercise' }, '2026-04-19')).not.toBe(
      tagFor({ activity: 'exercise' }, '2026-04-20'),
    )
  })

  it('starts with the shared prefix', () => {
    expect(tagFor({ activity: 'exercise' }, '2026-04-19')).toMatch(
      new RegExp(`^${NOTIFICATION_TAG_PREFIX}`),
    )
  })

  it('does not contain separators that could break OS dedup', () => {
    // dashes in dates must be stripped so "2026-04-19" and "20260419" do not coexist
    const tag = tagFor({ activity: 'exercise' }, '2026-04-19')
    expect(tag).toContain('20260419')
    expect(tag).not.toMatch(/2026-04-19/)
  })
})
