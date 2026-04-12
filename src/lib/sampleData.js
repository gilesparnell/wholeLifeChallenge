import { CHALLENGE_START } from './dates'

const EXERCISE_TYPES = ['Running', 'Swimming', 'Weights', 'Yoga', 'CrossFit', 'Cycling', 'Walking', 'HIIT']
const MOBILIZE_TYPES = ['Stretching', 'Yoga', 'Foam Rolling', 'Pilates', 'Mobility Drills']
const WELLBEING_ACTIVITIES = [
  'Meditation for 15 minutes',
  'Took a long walk in nature',
  'Journaled about gratitude',
  'Cold shower',
  'Digital detox for 2 hours',
  'Read a book for 30 minutes',
  'Called a friend',
  'Practiced breathwork',
]
const REFLECTIONS = [
  'Felt great today, hit all my targets.',
  'Struggled with nutrition but stayed on track with exercise.',
  'Good sleep last night made a big difference.',
  'Tough day at work but managed to get my workout in.',
  'Feeling the momentum building, day by day.',
  'Missed hydration target but everything else was solid.',
  'Best day of the challenge so far!',
  'Rest day energy — focused on mobility and recovery.',
  'Strong morning routine set the tone for the whole day.',
  'Pushing through the midway slump, staying consistent.',
]

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const chance = (pct) => Math.random() < pct

const formatDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const generateSampleData = (days = 30) => {
  const data = {}
  const start = new Date(CHALLENGE_START + 'T00:00:00')

  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dateStr = formatDate(d)

    // Simulate realistic patterns — good days more common, occasional bad days
    const isGoodDay = chance(0.7)

    const exerciseDone = isGoodDay ? chance(0.9) : chance(0.4)
    const mobilizeDone = isGoodDay ? chance(0.85) : chance(0.35)
    const sleepDone = chance(0.85)
    const sleepHours = sleepDone ? [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5][Math.floor(Math.random() * 10)] : null
    const hydrateMl = isGoodDay
      ? (Math.floor(Math.random() * 5) + 6) * 250  // 1500-2500
      : (Math.floor(Math.random() * 4) + 2) * 250  // 500-1250
    const wellbeingDone = isGoodDay ? chance(0.7) : chance(0.2)
    const reflectDone = chance(0.8)

    data[dateStr] = {
      nutrition: isGoodDay ? (chance(0.6) ? 5 : chance(0.5) ? 4 : 3) : (chance(0.4) ? 3 : chance(0.5) ? 2 : 1),
      exercise: {
        completed: exerciseDone,
        type: exerciseDone ? pick(EXERCISE_TYPES) : '',
      },
      mobilize: {
        completed: mobilizeDone,
        type: mobilizeDone ? pick(MOBILIZE_TYPES) : '',
      },
      sleep: {
        completed: sleepDone,
        hours: sleepHours,
      },
      hydrate: {
        completed: hydrateMl >= 2000,
        current_ml: hydrateMl,
        target_ml: 2000,
      },
      wellbeing: {
        completed: wellbeingDone,
        activity_text: wellbeingDone ? pick(WELLBEING_ACTIVITIES) : '',
      },
      reflect: {
        completed: reflectDone,
        reflection_text: reflectDone ? pick(REFLECTIONS) : '',
      },
    }
  }

  return data
}
