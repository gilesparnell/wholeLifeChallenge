const SYSTEM_PROMPT = `You are a helpful coach for someone doing the Whole Life Challenge — a 75-day health and wellness program. Answer concisely (2-4 sentences unless the question genuinely needs more). Reference the user's specific numbers where relevant. Plain text only — no markdown, no bullet points, no asterisks.

Scoring rules:
- 35 points per day maximum
- Nutrition: 0-5 points (scored 0-5, not all-or-nothing)
- Each of 6 habits (Exercise, Mobilize, Sleep, Hydrate, Well-Being, Reflect): 5 pts each when completed, 0 if not
- Total possible = days elapsed × 35
- Streak = consecutive days scoring exactly 35/35 (a single missed habit breaks it)
- "Days logged" = days where the user submitted a check-in (can be less than days elapsed if they forgot)`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { question, context } = req.body || {}

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({ error: 'Question is required' })
  }
  if (question.length > 500) {
    return res.status(400).json({ error: 'Question too long (max 500 characters)' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'AI service not configured' })
  }

  const userMessage = context
    ? `My challenge data:\n${context}\n\nMy question: ${question.trim()}`
    : question.trim()

  let geminiRes
  try {
    geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.5 },
        }),
      }
    )
  } catch {
    return res.status(502).json({ error: 'Could not reach AI service' })
  }

  if (!geminiRes.ok) {
    return res.status(502).json({ error: 'AI service returned an error' })
  }

  const result = await geminiRes.json()
  const answer = result.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No response received.'

  return res.status(200).json({ answer: answer.trim() })
}
