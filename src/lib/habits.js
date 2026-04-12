export const HABITS = [
  { id: 'exercise', label: 'Exercise', icon: '\u{1F3C3}', desc: '10+ min activity', color: '#E8634A', type: 'dropdown' },
  { id: 'mobilize', label: 'Mobilize', icon: '\u{1F9D8}', desc: '10 min stretching', color: '#E8A34A', type: 'dropdown' },
  { id: 'sleep', label: 'Sleep', icon: '\u{1F634}', desc: 'Log your hours', color: '#6B5CE7', type: 'hours' },
  { id: 'hydrate', label: 'Hydrate', icon: '\u{1F4A7}', desc: 'Track your water', color: '#4AAFE8', type: 'increment' },
  { id: 'wellbeing', label: 'Well-Being', icon: '\u{1F33F}', desc: 'Weekly practice', color: '#4AE88A', type: 'modal' },
  { id: 'reflect', label: 'Reflect', icon: '\u{1F4DD}', desc: 'Daily journal', color: '#E84A8A', type: 'modal' },
]

export const emptyDay = () => ({
  nutrition: 5,
  exercise: { completed: false, type: '', duration_minutes: null },
  mobilize: { completed: false, type: '', duration_minutes: null },
  sleep: { completed: false, hours: null },
  hydrate: { completed: false, current_ml: 0, target_ml: 2000 },
  wellbeing: { completed: false, activity_text: '' },
  reflect: { completed: false, reflection_text: '' },
  selfReport: null,
  bonusApplied: {},
})
