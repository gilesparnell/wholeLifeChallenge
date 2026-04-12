import { colors, fonts } from '../styles/theme'

const RESOURCES = [
  {
    category: 'Exercise & Fitness',
    articles: [
      { title: 'HIIT for Busy Schedules', url: 'https://www.wholelifechallenge.com/high-intensity-interval-training-hiit-for-busy-schedules-the-ultimate-guide-for-professionals/' },
      { title: 'Move Your Body in 10 Minutes', url: 'https://www.wholelifechallenge.com/move-your-body-in-only-10-minutes-no-gym-no-stress-all-sweat/' },
      { title: 'Functional Fitness for Aging Gracefully', url: 'https://www.wholelifechallenge.com/stay-strong-move-better-the-ultimate-guide-to-functional-fitness-for-aging-gracefully/' },
      { title: 'Push, Pull, Squat in 10 Minutes', url: 'https://www.wholelifechallenge.com/push-pull-squat-full-body-strength-and-fitness-in-10-minutes/' },
      { title: 'The Golden Mean Training Plan', url: 'https://www.wholelifechallenge.com/golden-mean-training-plan/' },
      { title: 'Exercise After 40', url: 'https://www.wholelifechallenge.com/the-4-principles-of-healthy-and-effective-exercise-after-40/' },
    ],
  },
  {
    category: 'Mobility & Flexibility',
    articles: [
      { title: 'Mobility vs. Flexibility Guide', url: 'https://www.wholelifechallenge.com/mobility-vs-flexibility-the-ultimate-guide-to-staying-active-and-independent-as-you-age/' },
      { title: 'Kettlebell Mobility for Shoulders & Back', url: 'https://www.wholelifechallenge.com/the-anti-sitting-solution-how-to-rescue-your-shoulders-and-back/' },
      { title: '5 Seated Hip Stretches', url: 'https://www.wholelifechallenge.com/5-seated-stretches-to-open-your-hips-and-close-your-day/' },
      { title: 'Build Better Posture', url: 'https://www.wholelifechallenge.com/build-better-posture-with-3-simple-bodyweight-exercises/' },
    ],
  },
  {
    category: 'Nutrition & Recipes',
    articles: [
      { title: 'Mental Health and Nutrition', url: 'https://www.wholelifechallenge.com/mental-health-and-nutrition-how-diet-impacts-mood-anxiety-and-cognitive-function/' },
      { title: 'Meal Prep Guide', url: 'https://www.wholelifechallenge.com/how-meal-prep-makes-your-life-better/' },
      { title: '8 WLC Compliant Salad Dressings', url: 'https://www.wholelifechallenge.com/8-quick-and-delicious-wlc-compliant-salad-dressings/' },
      { title: 'When to Eat for Weight Loss', url: 'https://www.wholelifechallenge.com/when-you-should-be-eating-if-you-want-to-lose-weight/' },
    ],
  },
  {
    category: 'Sleep',
    articles: [
      { title: 'Sleep Supplements: Boom or Bust?', url: 'https://www.wholelifechallenge.com/sleep-supplements-boom-or-bust/' },
      { title: 'Lack of Sleep Is Ruining Your Day', url: 'https://www.wholelifechallenge.com/lack-of-sleep-the-many-ways-its-silently-ruining-your-day/' },
      { title: 'Exercise When Sleep Deprived?', url: 'https://www.wholelifechallenge.com/running-on-empty-to-exercise-or-not-to-exercise-when-you-dont-get-enough-sleep/' },
    ],
  },
  {
    category: 'Hydration',
    articles: [
      { title: 'Hydration & Mental Health', url: 'https://www.wholelifechallenge.com/the-role-of-hydration-in-mental-health-and-cognitive-performance/' },
    ],
  },
  {
    category: 'Well-Being & Mindset',
    articles: [
      { title: 'The Power of Small Habit Change', url: 'https://www.wholelifechallenge.com/the-power-of-small-habit-change-building-a-better-you-one-step-at-a-time/' },
      { title: 'How Small Habits Rewrote My Life', url: 'https://www.wholelifechallenge.com/how-small-habits-rewrote-my-life-a-journey-beyond-the-gym/' },
      { title: '5 Ways to Achieve Mindfulness', url: 'https://www.wholelifechallenge.com/5-unexpected-ways-to-achieve-the-benefits-of-mindfulness/' },
      { title: '6 Tips for Habits That Last', url: 'https://www.wholelifechallenge.com/6-simple-tips-for-creating-new-habits-that-actually-last/' },
      { title: 'The Chaos Monkey: Improve Through Failure', url: 'https://www.wholelifechallenge.com/the-chaos-monkey-how-to-improve-your-life-through-failure/' },
      { title: 'Impulse Control', url: 'https://www.wholelifechallenge.com/how-the-whole-life-challenge-taught-me-impulse-control/' },
    ],
  },
  {
    category: 'WLC-Specific',
    articles: [
      { title: 'Healthcare Is Broken (And How to Fix It)', url: 'https://www.wholelifechallenge.com/healthcare-is-broken-and-how-to-fix-it/' },
      { title: 'How to Play When You\'re Sick', url: 'https://www.wholelifechallenge.com/how-to-play-the-whole-life-challenge-when-youre-sick/' },
      { title: 'The End of the WLC: Now What?', url: 'https://www.wholelifechallenge.com/the-end-of-the-whole-life-challenge-now-what/' },
      { title: 'Body Fat, Consistency & the WLC', url: 'https://www.wholelifechallenge.com/body-fat-consistency-and-understanding-the-whole-life-challenge/' },
      { title: 'The Importance of "Whole" in Your Life', url: 'https://www.wholelifechallenge.com/the-importance-of-whole-in-your-whole-life-challenge/' },
    ],
  },
]

export default function Info() {
  return (
    <div style={{ animation: 'fadeUp 0.4s ease' }}>
      <h2 style={{ fontFamily: fonts.display, fontSize: 24, fontWeight: 300, marginBottom: 8, textAlign: 'center' }}>
        Resources
      </h2>
      <p style={{ fontSize: 12, color: colors.textDim, textAlign: 'center', marginBottom: 24 }}>
        Curated articles from the Whole Life Challenge blog
      </p>

      {RESOURCES.map((section) => (
        <div key={section.category} style={{ marginBottom: 20 }}>
          <h3 style={{
            fontSize: 13, fontWeight: 700, color: colors.accent, textTransform: 'uppercase',
            letterSpacing: 1.5, marginBottom: 8,
          }}>
            {section.category}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.articles.map((article) => (
              <a
                key={article.url}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', background: colors.surface, borderRadius: 10,
                  padding: '12px 14px', border: `1px solid ${colors.border}`,
                  color: colors.text, textDecoration: 'none', fontSize: 13,
                  transition: 'border-color 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = colors.accent}
                onMouseOut={(e) => e.currentTarget.style.borderColor = colors.border}
              >
                {article.title}
                <span style={{ color: colors.textGhost, marginLeft: 6 }}>{'\u2192'}</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
