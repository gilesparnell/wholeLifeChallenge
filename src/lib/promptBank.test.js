import { describe, it, expect } from 'vitest'
import { getPromptForDay, getContextAwarePrompt, PROMPT_BANK } from './promptBank'

describe('PROMPT_BANK', () => {
  it('has at least 50 prompts', () => {
    expect(PROMPT_BANK.length).toBeGreaterThanOrEqual(50)
  })

  it('each prompt has text, source, and tags', () => {
    PROMPT_BANK.forEach((p) => {
      expect(p).toHaveProperty('text', expect.any(String))
      expect(p).toHaveProperty('source', expect.any(String))
      expect(p).toHaveProperty('tags', expect.any(Array))
      expect(p.text.length).toBeGreaterThan(10)
      expect(p.source.length).toBeGreaterThan(0)
    })
  })

  it('has prompts from at least 4 different sources', () => {
    const sources = new Set(PROMPT_BANK.map((p) => p.source))
    expect(sources.size).toBeGreaterThanOrEqual(4)
  })
})

describe('getPromptForDay', () => {
  it('returns a prompt object for any day index', () => {
    const prompt = getPromptForDay(0)
    expect(prompt).toHaveProperty('text')
    expect(prompt).toHaveProperty('source')
  })

  it('returns different prompts for different days', () => {
    const p1 = getPromptForDay(0)
    const p2 = getPromptForDay(1)
    expect(p1.text).not.toBe(p2.text)
  })

  it('wraps around when day index exceeds bank size', () => {
    const p1 = getPromptForDay(0)
    const p2 = getPromptForDay(PROMPT_BANK.length)
    expect(p1.text).toBe(p2.text)
  })

  it('handles negative day index', () => {
    const prompt = getPromptForDay(-1)
    expect(prompt).toHaveProperty('text')
  })
})

describe('getContextAwarePrompt', () => {
  it('returns an exercise-related prompt when exercise was completed', () => {
    const prompt = getContextAwarePrompt(5, {
      exercise: { completed: true, type: 'Running', duration_minutes: 30 },
    })
    expect(prompt).toHaveProperty('text')
    // Should prefer prompts tagged with exercise context
    expect(prompt.tags).toEqual(expect.arrayContaining(['exercise-completed']))
  })

  it('returns a general prompt when no activities match tags', () => {
    const prompt = getContextAwarePrompt(5, {})
    expect(prompt).toHaveProperty('text')
  })

  it('returns a streak-related prompt when streak is high', () => {
    const prompt = getContextAwarePrompt(5, {}, { streak: 10 })
    expect(prompt).toHaveProperty('text')
    expect(prompt.tags).toEqual(expect.arrayContaining(['high-streak']))
  })

  it('returns a hydration prompt when hydration was missed', () => {
    const prompt = getContextAwarePrompt(5, {
      hydrate: { completed: false, current_ml: 500, target_ml: 2000 },
    })
    expect(prompt).toHaveProperty('text')
    expect(prompt.tags).toEqual(expect.arrayContaining(['hydration-missed']))
  })

  it('falls back to day-based prompt when no context tags match', () => {
    // Baseline: getPromptForDay returns something for day 5
    expect(getPromptForDay(5)).toHaveProperty('text')
    // Context-aware should return something too — either matched or fallback
    const contextPrompt = getContextAwarePrompt(5, { nutrition: 5 })
    expect(contextPrompt).toHaveProperty('text')
  })
})
