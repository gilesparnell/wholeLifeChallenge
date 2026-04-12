/**
 * Reflexion prompt bank — 60+ prompts from leading thinkers,
 * tagged for context-aware selection.
 *
 * Tags: general, exercise-completed, hydration-missed, high-streak,
 *       sleep, nutrition, wellbeing, low-energy, rest-day
 */

export const PROMPT_BANK = [
  // --- Stoic Philosophy ---
  { text: "What is one thing you did today that you can be genuinely proud of, no matter how small?", source: "Marcus Aurelius", tags: ['general'] },
  { text: "You have power over your mind, not outside events. What events today tested your composure, and how did you respond?", source: "Marcus Aurelius", tags: ['general', 'wellbeing'] },
  { text: "How did today bring you closer to the person you want to become?", source: "Marcus Aurelius", tags: ['general', 'high-streak'] },
  { text: "What obstacle did you face today, and what opportunity was hidden inside it?", source: "Marcus Aurelius", tags: ['general'] },
  { text: "If today were your last, would you be satisfied with how you spent it?", source: "Marcus Aurelius", tags: ['general'] },
  { text: "We suffer more in imagination than in reality. What worried you today that turned out to be manageable?", source: "Seneca", tags: ['general', 'wellbeing'] },
  { text: "It is not that we have a short time to live, but that we waste much of it. How did you invest your time today?", source: "Seneca", tags: ['general'] },
  { text: "Difficulty strengthens the mind as labour does the body. What difficulty today made you stronger?", source: "Seneca", tags: ['general', 'exercise-completed'] },
  { text: "Begin at once to live, and count each separate day as a separate life. What made this life worth living?", source: "Seneca", tags: ['general'] },
  { text: "No person is free who is not master of themselves. Where did you exercise self-mastery today?", source: "Epictetus", tags: ['general', 'nutrition'] },
  { text: "First say to yourself what you would be; then do what you have to do. Did your actions align with your intentions today?", source: "Epictetus", tags: ['general'] },
  { text: "It is not what happens to you, but how you react to it that matters. What reaction today are you proud of?", source: "Epictetus", tags: ['general', 'wellbeing'] },

  // --- Positive Psychology ---
  { text: "Name three good things that happened today, no matter how small. Why did each one matter?", source: "Martin Seligman", tags: ['general'] },
  { text: "When were you most in flow today — completely absorbed in what you were doing?", source: "Mihaly Csikszentmihalyi", tags: ['general', 'exercise-completed'] },
  { text: "What character strength did you use most today? How did it help you?", source: "Martin Seligman", tags: ['general'] },
  { text: "Who made your day better, and how did you make someone else's day better?", source: "Martin Seligman", tags: ['general', 'wellbeing'] },
  { text: "What did you learn today that surprised you?", source: "Carol Dweck", tags: ['general'] },
  { text: "Where did you choose effort over comfort today? What did that feel like?", source: "Carol Dweck", tags: ['general', 'exercise-completed'] },
  { text: "What's one thing you struggled with today that you'll be better at tomorrow because of the struggle?", source: "Carol Dweck", tags: ['general'] },
  { text: "Your body achieved something today. How did that physical effort affect your mental state?", source: "Kelly McGonigal", tags: ['exercise-completed'] },
  { text: "Movement is medicine. How did your body feel after today's activity compared to before?", source: "Kelly McGonigal", tags: ['exercise-completed'] },
  { text: "What moment today brought you genuine joy, not just pleasure?", source: "Martin Seligman", tags: ['general', 'wellbeing'] },

  // --- Mindfulness ---
  { text: "What did you notice today that you usually overlook?", source: "Thich Nhat Hanh", tags: ['general'] },
  { text: "When did you feel most present today — fully here, not thinking about past or future?", source: "Thich Nhat Hanh", tags: ['general', 'wellbeing'] },
  { text: "Breathing in, I calm body and mind. What helped you find calm today?", source: "Thich Nhat Hanh", tags: ['general', 'rest-day'] },
  { text: "What emotion visited you most often today? Did you welcome it or resist it?", source: "Tara Brach", tags: ['general', 'wellbeing'] },
  { text: "Where in your body do you feel today's experiences stored? What does that tell you?", source: "Jon Kabat-Zinn", tags: ['general', 'exercise-completed'] },
  { text: "You can't stop the waves, but you can learn to surf. What wave did you ride today?", source: "Jon Kabat-Zinn", tags: ['general'] },
  { text: "What would it look like to approach tomorrow with beginner's mind?", source: "Shunryu Suzuki", tags: ['general'] },
  { text: "How did you nourish yourself today — body, mind, and spirit?", source: "Thich Nhat Hanh", tags: ['general', 'nutrition', 'wellbeing'] },

  // --- Leadership & Vulnerability ---
  { text: "Where did you show courage today, even in a small way?", source: "Brene Brown", tags: ['general'] },
  { text: "What's one thing you're grateful for about your body today?", source: "Brene Brown", tags: ['general', 'exercise-completed'] },
  { text: "Vulnerability is not weakness. Where did you let yourself be seen today?", source: "Brene Brown", tags: ['general', 'wellbeing'] },
  { text: "Did you choose courage over comfort at any point today?", source: "Brene Brown", tags: ['general'] },
  { text: "Start with why. Why are you doing this challenge? Has that reason changed?", source: "Simon Sinek", tags: ['general', 'high-streak'] },
  { text: "A team is not a group of people who work together. It is a group who trust each other. Who do you trust with your goals?", source: "Simon Sinek", tags: ['general'] },

  // --- Context-Specific: Exercise ---
  { text: "You showed up and moved your body. What made you push through the moment you wanted to stop?", source: "David Goggins", tags: ['exercise-completed'] },
  { text: "The body achieves what the mind believes. What did your mind tell your body today?", source: "Napoleon Hill", tags: ['exercise-completed'] },
  { text: "You ran, lifted, or stretched today. A year ago, would you have done the same?", source: "James Clear", tags: ['exercise-completed', 'high-streak'] },

  // --- Context-Specific: Hydration ---
  { text: "You didn't hit your water target today. What got in the way, and what could make it easier tomorrow?", source: "Wellness Practice", tags: ['hydration-missed'] },
  { text: "Dehydration affects mood and focus before you even notice thirst. How did your energy compare to days when you drink enough?", source: "Wellness Practice", tags: ['hydration-missed'] },
  { text: "Small habits compound. Could you set a reminder or keep water visible to hit your target tomorrow?", source: "James Clear", tags: ['hydration-missed'] },

  // --- Context-Specific: Sleep ---
  { text: "Sleep is the single most effective thing you can do to reset your brain and body. How was your sleep last night?", source: "Matthew Walker", tags: ['sleep'] },
  { text: "The shorter your sleep, the shorter your life. What could you change about tonight's routine to sleep better?", source: "Matthew Walker", tags: ['sleep', 'low-energy'] },

  // --- Context-Specific: Streaks ---
  { text: "You're on a streak. Every action is a vote for the person you're becoming. What identity is this streak building?", source: "James Clear", tags: ['high-streak'] },
  { text: "Consistency beats intensity. Your streak proves you've chosen consistency. What keeps you showing up?", source: "James Clear", tags: ['high-streak'] },
  { text: "The compound effect is real. Your streak is proof. What small gains are you noticing?", source: "Darren Hardy", tags: ['high-streak'] },

  // --- Context-Specific: Rest & Recovery ---
  { text: "Rest is not laziness. It's preparation. What is your body preparing for?", source: "Arianna Huffington", tags: ['rest-day', 'low-energy'] },
  { text: "Your recovery score suggests your body needs attention. What would genuinely help you recharge?", source: "Wellness Practice", tags: ['low-energy'] },

  // --- Context-Specific: Nutrition ---
  { text: "Food is information for your body. What message did you send your body with your food choices today?", source: "Mark Hyman", tags: ['nutrition'] },
  { text: "You can't out-train a bad diet. How did your nutrition support your goals today?", source: "Wellness Practice", tags: ['nutrition'] },

  // --- General Wisdom ---
  { text: "We are what we repeatedly do. Excellence, then, is not an act but a habit. What habit are you building?", source: "Will Durant (on Aristotle)", tags: ['general', 'high-streak'] },
  { text: "The only way to do great work is to love what you do. Did anything today feel like that?", source: "Steve Jobs", tags: ['general'] },
  { text: "Between stimulus and response there is a space. In that space is our freedom. Did you find that space today?", source: "Viktor Frankl", tags: ['general', 'wellbeing'] },
  { text: "He who has a why to live can bear almost any how. What is your why for this challenge?", source: "Friedrich Nietzsche", tags: ['general'] },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall. Where did you rise today?", source: "Nelson Mandela", tags: ['general'] },
  { text: "In the middle of difficulty lies opportunity. What opportunity did today's challenges reveal?", source: "Albert Einstein", tags: ['general'] },
  { text: "Take care of your body. It's the only place you have to live. How did you take care of yours today?", source: "Jim Rohn", tags: ['general', 'exercise-completed', 'nutrition'] },
  { text: "Knowing is not enough; we must apply. Being willing is not enough; we must do. What did you apply today?", source: "Bruce Lee", tags: ['general'] },
]

/**
 * Get the prompt for a specific day index. Rotates through the bank.
 */
export const getPromptForDay = (dayIndex) => {
  const len = PROMPT_BANK.length
  const idx = ((dayIndex % len) + len) % len // handles negative indices
  return PROMPT_BANK[idx]
}

/**
 * Get a context-aware prompt based on today's activity data.
 * Prefers prompts matching the user's context, falls back to day-based.
 */
export const getContextAwarePrompt = (dayIndex, dayData, meta = {}) => {
  const contextTags = []

  // Determine context from day data
  if (dayData?.exercise?.completed) contextTags.push('exercise-completed')
  if (dayData?.hydrate && !dayData.hydrate.completed) contextTags.push('hydration-missed')
  if (dayData?.sleep?.completed) contextTags.push('sleep')
  if (meta?.streak >= 5) contextTags.push('high-streak')
  if (meta?.recoveryScore != null && meta.recoveryScore < 40) contextTags.push('low-energy')

  if (contextTags.length > 0) {
    // Find prompts matching any of the context tags
    const matching = PROMPT_BANK.filter((p) =>
      p.tags.some((t) => contextTags.includes(t))
    )

    if (matching.length > 0) {
      // Use day index to pick deterministically from matching set
      const idx = ((dayIndex % matching.length) + matching.length) % matching.length
      return matching[idx]
    }
  }

  // Fallback to day-based prompt
  return getPromptForDay(dayIndex)
}
