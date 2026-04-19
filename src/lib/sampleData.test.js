// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { generateSampleData } from './sampleData'
import { CHALLENGE_START, getDayIndex } from './dates'

describe('generateSampleData', () => {
  it('generates entries for the specified number of days', () => {
    const data = generateSampleData(30)
    const keys = Object.keys(data)
    expect(keys.length).toBe(30)
  })

  it('starts from CHALLENGE_START date', () => {
    const data = generateSampleData(5)
    const keys = Object.keys(data)
    expect(keys[0]).toBe(CHALLENGE_START)
  })

  it('generates consecutive dates', () => {
    const data = generateSampleData(5)
    const keys = Object.keys(data)
    for (let i = 0; i < keys.length; i++) {
      expect(getDayIndex(keys[i])).toBe(i)
    }
  })

  it('each day has nutrition between 0 and 5', () => {
    const data = generateSampleData(30)
    Object.values(data).forEach((day) => {
      expect(day.nutrition).toBeGreaterThanOrEqual(0)
      expect(day.nutrition).toBeLessThanOrEqual(5)
    })
  })

  it('each day has valid exercise object', () => {
    const data = generateSampleData(30)
    Object.values(data).forEach((day) => {
      expect(day.exercise).toHaveProperty('completed')
      expect(day.exercise).toHaveProperty('type')
      if (day.exercise.completed) {
        expect(day.exercise.type.length).toBeGreaterThan(0)
      }
    })
  })

  it('each day has valid sleep object with hours between 4 and 10', () => {
    const data = generateSampleData(30)
    Object.values(data).forEach((day) => {
      expect(day.sleep).toHaveProperty('completed')
      if (day.sleep.completed && day.sleep.hours !== null) {
        expect(day.sleep.hours).toBeGreaterThanOrEqual(4)
        expect(day.sleep.hours).toBeLessThanOrEqual(10)
      }
    })
  })

  it('each day has valid hydrate object with current_ml >= 0', () => {
    const data = generateSampleData(30)
    Object.values(data).forEach((day) => {
      expect(day.hydrate).toHaveProperty('completed')
      expect(day.hydrate).toHaveProperty('current_ml')
      expect(day.hydrate).toHaveProperty('target_ml')
      expect(day.hydrate.current_ml).toBeGreaterThanOrEqual(0)
      expect(day.hydrate.target_ml).toBe(2000)
    })
  })

  it('each day has valid wellbeing object', () => {
    const data = generateSampleData(30)
    Object.values(data).forEach((day) => {
      expect(day.wellbeing).toHaveProperty('completed')
      expect(day.wellbeing).toHaveProperty('activity_text')
    })
  })

  it('each day has valid reflect object', () => {
    const data = generateSampleData(30)
    Object.values(data).forEach((day) => {
      expect(day.reflect).toHaveProperty('completed')
      expect(day.reflect).toHaveProperty('reflection_text')
    })
  })

  it('generates varied data (not all identical)', () => {
    const data = generateSampleData(30)
    const nutritionValues = Object.values(data).map((d) => d.nutrition)
    const unique = new Set(nutritionValues)
    expect(unique.size).toBeGreaterThan(1)
  })

  it('defaults to 30 days when no argument given', () => {
    const data = generateSampleData()
    expect(Object.keys(data).length).toBe(30)
  })
})
