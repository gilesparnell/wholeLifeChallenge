---
title: "feat: WLC v3 — UX Polish, Enhanced Dashboard, Bonus Tracking & AI Reflections"
type: feat
status: active
date: 2026-04-12
---

# WLC v3 — UX Polish, Enhanced Dashboard, Bonus Tracking & AI Reflections

## Overview

Eleven improvements spanning bug fixes, UX polish, enhanced metrics, WLC bonus tracking, and AI-powered reflexion prompts. Organised into four phases by dependency and risk.

## Items Summary

| # | Category | Item | Priority |
|---|----------|------|----------|
| 1 | Bug/UX | Light/dark theme — hard to read in daylight | P1 |
| 6 | Bug/UX | Font sizes too small on mobile | P1 |
| 7 | Bug/UX | Desktop view doesn't use screen real estate | P1 |
| 8 | Bug | Hydration target appears static, should come from admin | P1 |
| 9 | Bug | Splash screen still says "42 days" — make configurable in admin | P1 |
| 2 | Feature | Exercise duration tracking (how long per activity) | P2 |
| 3 | Feature | Exercise duration in dashboard metrics | P2 |
| 5 | Feature | WLC bonus system with visual progress indicators | P2 |
| 4 | Feature | Recovery/strain/sleep dashboard metrics + AI predictions | P3 |
| 10 | Feature | AI reflexion prompts with daily wisdom from leading thinkers | P3 |
| 11 | Feature | Context-aware reflexion suggestions based on completed activities | P3 |

---

## Phase 1: UX Polish & Bug Fixes (Items 1, 6, 7, 8, 9)

### 1.1 Light/Dark Theme Toggle (Item 1)

**Problem:** All styling uses inline `style` props referencing a static `colors` object from `src/styles/theme.js`. No runtime theme switching is possible.

**Approach: CSS Custom Properties + ThemeContext**

1. **Define CSS variables** in `src/index.css` for both themes:
   ```css
   :root, [data-theme='light'] {
     --color-bg: #f5f3ef;
     --color-surface: #ffffff;
     --color-text: #1a1a1a;
     --color-text-dim: #666666;
     --color-accent: #E8634A;
     --color-border: #e0e0e0;
     /* ... all current colors from theme.js mapped to semantic names */
   }

   [data-theme='dark'] {
     --color-bg: #0D0D0F;
     --color-surface: #141416;
     --color-text: #f0ebe3;
     --color-text-dim: #888888;
     --color-accent: #E8634A;
     --color-border: #1e1e22;
   }
   ```

2. **Inline FOUC-prevention script** in `index.html` `<head>`:
   ```javascript
   (function() {
     var t = localStorage.getItem('wlc-theme');
     if (t) document.documentElement.setAttribute('data-theme', t);
     else if (window.matchMedia('(prefers-color-scheme: dark)').matches)
       document.documentElement.setAttribute('data-theme', 'dark');
     else document.documentElement.setAttribute('data-theme', 'light');
   })();
   ```

3. **Create `ThemeContext`** — exposes `theme` ('light'|'dark'|'system') and `toggleTheme()`. Persists to localStorage key `wlc-theme`. Listens for `prefers-color-scheme` changes.

4. **Migrate `theme.js`** to return `var(--color-*)` references instead of hardcoded hex values. This is the largest mechanical change — every component that imports `colors` will now get CSS variable references.

5. **Add theme toggle** in Layout header (sun/moon icon).

**Files to modify:**
- `src/index.css` — CSS variable definitions
- `index.html` — FOUC prevention script
- `src/styles/theme.js` — switch to CSS variable references
- `src/contexts/ThemeContext.jsx` — new context
- `src/components/Layout.jsx` — add toggle button, update global `<style>` tag
- `src/index.css` — body background via CSS variable

**Edge cases:**
- FOUC prevention: the inline script must run before first paint
- `prefers-color-scheme` listener for system theme changes
- Ensure WCAG AA contrast ratios in both themes
- The accent colour (#E8634A) works on both light and dark backgrounds
- Charts (Recharts) need theme-aware colours for axes, tooltips, grid

**Light theme palette suggestion:**
- Background: `#f5f3ef` (warm off-white)
- Surface/cards: `#ffffff`
- Text: `#1a1a1a`
- Text dim: `#666666`
- Border: `#e0e0e0`
- Accent: `#E8634A` (unchanged)

### 1.2 Font Size Increase for Mobile (Item 6)

**Problem:** Multiple elements use 10-11px font sizes which are difficult to read on mobile.

**Changes (minimum sizes):**
- Nav labels: 11px → 12px
- Stat labels: 10px → 11px
- Habit descriptions: 11px → 12px
- Streak badges: 11px → 12px
- Date range subtitle: 12px → 13px
- Leaderboard subtitle text: 11px → 12px
- General body text minimum: 12px (nothing below)

**Files to modify:** `src/components/Layout.jsx`, `src/pages/CheckIn.jsx`, `src/pages/Progress.jsx`, `src/pages/Journal.jsx`, `src/pages/Leaderboard.jsx`

### 1.3 Desktop Responsive Layout (Item 7)

**Problem:** `Layout.jsx` hardcodes `maxWidth: 480` — the entire app is a narrow mobile column on desktop.

**Approach: Breakpoint-aware layout via CSS variables + media queries**

1. Remove `maxWidth: 480` from Layout inline styles
2. Add responsive CSS in Layout's `<style>` tag:
   ```css
   .wlc-container {
     max-width: 480px;
     margin: 0 auto;
     padding: 20px 16px 40px;
   }

   @media (min-width: 768px) {
     .wlc-container {
       max-width: 720px;
       padding: 32px 24px 48px;
     }
   }

   @media (min-width: 1024px) {
     .wlc-container {
       max-width: 960px;
     }
   }
   ```

3. **CheckIn page** — on desktop (>=768px), show stats row and habits in a 2-column grid
4. **Progress page** — on desktop, show charts 2-up side-by-side
5. **Nav bar** — increase font size and spacing on desktop

**Files to modify:** `src/components/Layout.jsx`, `src/pages/CheckIn.jsx`, `src/pages/Progress.jsx`

### 1.4 Hydration Target from Admin (Item 8)

**Problem:** The HydrateCard shows a target that appears static. The target_ml defaults from admin config, but the display text may not be updating reactively.

**Fix:**
1. Verify `HydrateCard` reads `target_ml` from the value prop (it does via `config.hydrationTargetMl`)
2. Ensure the grey text showing "X / Y ml" updates when admin config changes
3. The 250ml increment is hardcoded in `HydrateCard.jsx` — make it configurable from admin too

**Files to modify:** `src/components/habits/HydrateCard.jsx`, `src/lib/adminConfig.js`, `src/pages/Admin.jsx`

### 1.5 Configurable Challenge Duration & Splash Screen (Item 9)

**Problem:** `AuthGate.jsx` hardcodes "42 Days of Change" and "Apr 11 — May 22, 2026". `dates.js` has `CHALLENGE_DAYS = 75` and `CHALLENGE_START = '2026-04-12'`. These are out of sync and neither is admin-configurable.

**Approach:**
1. Move `CHALLENGE_DAYS` and `CHALLENGE_START` into admin config (with current values as defaults)
2. Update `AuthGate.jsx` to read from config — compute end date dynamically:
   ```javascript
   const endDate = new Date(CHALLENGE_START)
   endDate.setDate(endDate.getDate() + CHALLENGE_DAYS - 1)
   ```
3. Show `"{CHALLENGE_DAYS} Days of Change"` and computed date range
4. Add challenge start date and duration fields to Admin page
5. Sync admin config to Supabase (currently localStorage-only) so all users see the same challenge parameters

**Files to modify:** `src/components/AuthGate.jsx`, `src/lib/dates.js`, `src/lib/adminConfig.js`, `src/pages/Admin.jsx`

**Edge cases:**
- Changing challenge duration mid-challenge: existing data for dates beyond new end date should remain but be hidden from charts
- Changing start date mid-challenge: recalculate all day indices

---

## Phase 2: Exercise Duration & WLC Bonuses (Items 2, 3, 5)

### 2.1 Exercise Duration Tracking (Item 2)

**Current state:** `ExerciseCard` records `{ completed: true, type: 'Running' }`. No duration field.

**Changes:**
1. Add `duration_minutes` to exercise data shape: `{ completed: bool, type: string, duration_minutes: number }`
2. After selecting exercise type, show a duration input (quick-select buttons: 10, 15, 20, 30, 45, 60, 90 min + custom)
3. Completed = true when both type and duration are set
4. Same pattern for mobilise: `{ completed: bool, type: string, duration_minutes: number }`

**Data migration:** Existing entries without `duration_minutes` should default to `null` (not 0) — distinguish "not tracked" from "0 minutes"

**Files to modify:** `src/components/habits/ExerciseCard.jsx`, `src/lib/habits.js`

**Supabase consideration:** The `exercise` and `mobilize` JSONB columns already accept arbitrary objects, so no schema migration needed.

### 2.2 Exercise Duration in Dashboard (Item 3)

**New charts for Progress.jsx:**
1. **Weekly Exercise Minutes** — bar chart showing total exercise + mobilise minutes per week
2. **Activity Type Breakdown** — pie/donut chart showing time distribution by exercise type
3. **Duration Trend** — line chart showing daily exercise minutes over time

**Files to modify:** `src/pages/Progress.jsx`

### 2.3 WLC Bonus System (Item 5)

**Research findings — 4 bonus types:**

| Bonus | Trigger | Value | Type |
|-------|---------|-------|------|
| **Indulgence** | 18+/20 nutrition points over 4 consecutive days | 1 food point (auto-applied) | Auto |
| **Rest Day** | 10 consecutive days full exercise | 5 exercise points (auto-applied) | Auto |
| **Night Owl** | 6 consecutive days meeting sleep goal | 5 sleep points (auto-applied) | Auto |
| **Free Day** | 730+/735 points over 21 consecutive days | Full day score (user-activated) | Manual |

**Implementation:**

1. **New module `src/lib/bonuses.js`:**
   - `computeBonuses(data, allDates, dayIndex)` — scans data for earned bonuses
   - Returns: `{ indulgence: { earned: N, used: N, available: N }, restDay: {...}, nightOwl: {...}, freeDay: {...} }`
   - Track bonus usage in day data: `{ ..., bonusUsed: { type: 'restDay' } }`

2. **Visual progress indicators on CheckIn page:**
   - Below the stats row, show 4 bonus cards:
     ```
     [Indulgence]     [Rest Day]      [Night Owl]     [Free Day]
     ████░░░░ 3/4     ██████░░░░ 6/10  ████░░ 4/6     ████████████░░░░░░░░░ 12/21
     1 available      2 days to go     2 days to go    9 days to go
     ```
   - Progress bars showing streak toward next bonus
   - Badge count for available bonuses
   - Colour coding: green when available, accent when in-progress

3. **Auto-application logic:**
   - When user scores < 5 nutrition and has indulgence bonus available → auto-apply, show toast
   - When user logs "no exercise" and has rest day bonus → auto-apply, show toast
   - When user logs "no sleep" and has night owl bonus → auto-apply, show toast

4. **Free Day activation:**
   - Show a special "Free Day" button when available
   - When activated, auto-fill all habits for that day

**Files to create:** `src/lib/bonuses.js`, `src/lib/bonuses.test.js`
**Files to modify:** `src/pages/CheckIn.jsx`, `src/lib/scoring.js`

---

## Phase 3: Enhanced Dashboard & AI Reflections (Items 4, 10, 11)

### 3.1 Recovery/Strain/Sleep Metrics (Item 4)

**Approach: Self-reported metrics (no wearables needed)**

Add optional daily self-report fields (after habit check-in):

| Metric | Scale | Question |
|--------|-------|----------|
| Sleep Quality | 1-5 | "How well did you sleep?" |
| Energy Level | 1-5 | "How energised do you feel?" |
| Muscle Soreness | 1-5 | "How sore are your muscles?" |
| Stress Level | 1-5 | "How stressed do you feel?" |
| Mood | 1-5 | "How positive is your mood?" |

**Recovery Score (0-100):**
```
recovery = (
  (sleepQuality / 5) * 0.25 +
  (clamp(sleepHours, 5, 9) - 5) / 4 * 0.20 +
  (energyLevel / 5) * 0.20 +
  ((6 - soreness) / 5) * 0.15 +
  ((6 - stressLevel) / 5) * 0.10 +
  (mood / 5) * 0.10
) * 100
```

**Strain Score (0-21, inspired by WHOOP's Borg Scale):**
```
strain = (exerciseDuration / 60) * intensityMultiplier * 3.5
```
Where `intensityMultiplier` maps exercise type to effort (HIIT=1.0, Running=0.8, Walking=0.4, Yoga=0.3, etc.)

**Dashboard additions (Progress.jsx):**
- Recovery score gauge (0-100 with green/yellow/red zones)
- 7-day recovery trend line
- Strain vs recovery scatter plot
- Sleep duration + quality combined chart
- AI insight: "Your recovery is trending down. Consider a lighter exercise day."

**AI predictions (using Gemini Flash — free tier):**
- Daily recovery prediction based on 7-day trends
- Exercise intensity recommendations
- Sleep optimisation suggestions

**Files to create:** `src/lib/recovery.js`, `src/lib/recovery.test.js`, `src/components/RecoveryGauge.jsx`
**Files to modify:** `src/pages/CheckIn.jsx` (add self-report section), `src/pages/Progress.jsx`

### 3.2 AI Reflexion Prompts (Item 10)

**Architecture: Hybrid approach**

1. **Pre-generated prompt bank (offline, no API cost):**
   - 200+ prompts tagged by philosophy source and mood range
   - Sources: Stoic philosophy (Marcus Aurelius, Seneca, Epictetus), Positive psychology (Seligman, Csikszentmihalyi), Mindfulness (Thich Nhat Hanh, Jon Kabat-Zinn), Leadership (Brene Brown, Simon Sinek)
   - Rotate daily using `dayIndex % promptBank.length`
   - Different prompt each day for 200+ days

2. **Live AI generation (optional, for context-aware prompts):**
   - Use **Gemini 2.0 Flash** (free tier: 1,000 req/day)
   - Cost: ~$0.0008/month per user on paid tier
   - Prompt template:
     ```
     You are a wellness reflection coach. Today the user:
     - Completed: {habits_list}
     - Missed: {missed_list}
     - Mood: {mood}/5, Energy: {energy}/5
     - It is {day_of_week} evening, day {day_number} of their challenge.

     Generate one short reflection prompt (1-2 sentences) drawing from
     {rotate: stoic / positive psychology / mindfulness}. End with an
     open question. Do not repeat: {last_two_prompts}
     ```

3. **UX in ActivityModal:**
   - Add an info icon (i) next to the Reflect title
   - Tapping opens a prompt suggestion card above the textarea
   - Card shows: quote/prompt + attribution ("Inspired by Marcus Aurelius")
   - "Try another" button to cycle prompts
   - Prompt is a suggestion — user writes their own reflexion

**Files to create:** `src/lib/promptBank.js`, `src/lib/aiReflection.js`
**Files to modify:** `src/components/modals/ActivityModal.jsx`

### 3.3 Context-Aware Reflexion Suggestions (Item 11)

**Enhancement to 3.2 — prompts reference the user's actual activity data:**

- If user completed exercise: "You ran for 30 minutes today. How did that physical effort affect your mental state?"
- If user missed hydration: "You didn't hit your water target today. What got in the way?"
- If streak is high: "You're on a 12-day streak. What's keeping you motivated?"
- If recovery score is low: "Your energy and recovery are dipping. What would help you recharge?"

**Implementation:**
- Build context string from today's data before generating prompt
- Pass to AI or use to select from tagged prompt bank
- Tag prompts in bank with applicable contexts (e.g., `tags: ['exercise-completed', 'high-streak']`)

---

## Phase Summary

| Phase | Items | Risk | Dependencies |
|-------|-------|------|--------------|
| **P1: UX Polish** | 1, 6, 7, 8, 9 | Low | None — all internal changes |
| **P2: Exercise + Bonuses** | 2, 3, 5 | Medium | Data shape change for exercise duration |
| **P3: Dashboard + AI** | 4, 10, 11 | Higher | Gemini API key, recovery data collection, prompt bank creation |

## Acceptance Criteria

### Phase 1
- [ ] Light and dark themes with toggle in header; respects system preference
- [ ] No text below 12px on mobile
- [ ] Desktop (>=768px) uses wider layout with multi-column where appropriate
- [ ] Hydration target and increment configurable from admin
- [ ] Challenge duration and start date configurable from admin
- [ ] AuthGate splash screen reads from admin config (not hardcoded)
- [ ] Both themes pass WCAG AA contrast ratios

### Phase 2
- [ ] Exercise card captures duration in minutes
- [ ] Mobilise card captures duration in minutes
- [ ] Duration appears in Progress page charts (weekly totals, activity breakdown)
- [ ] All 4 WLC bonus types calculated correctly from data
- [ ] Bonus progress indicators visible on CheckIn page
- [ ] Auto-application of indulgence, rest day, and night owl bonuses
- [ ] Free day manual activation works
- [ ] Bonus calculations have comprehensive unit tests

### Phase 3
- [ ] 5 self-report metrics collectible after daily check-in
- [ ] Recovery score (0-100) calculated and displayed
- [ ] Strain score derived from exercise type + duration
- [ ] Recovery trend chart on Progress page
- [ ] AI-generated reflexion prompts appear in Reflect modal
- [ ] Prompts change daily and don't repeat within a week
- [ ] Prompts reference user's completed/missed activities when AI is available
- [ ] Offline prompt bank works without API key (graceful fallback)
- [ ] Info icon in Reflect modal opens prompt suggestion

## Technical Considerations

- **Theme migration is the riskiest change** — every component references `colors`. Migrating to CSS variables requires touching all files. Consider a staged approach: update `theme.js` to return `var()` strings, then components need zero changes.
- **Supabase schema** — exercise/mobilise JSONB columns handle new `duration_minutes` field without migration. Self-report data needs a new field or separate table.
- **Admin config sync** — currently localStorage-only. Should sync to Supabase `admin_config` table so challenge parameters are consistent across all users.
- **Gemini API key** — needs to be added as a Vercel env var (`VITE_GEMINI_API_KEY`). Free tier is sufficient for small user base.
- **Apple Health integration** — not feasible from a PWA. Would require a native iOS companion app or third-party bridge (Terra API ~$0.50/user/month). Recommend deferring — self-reported data covers the use case.

## Sources & References

### WLC Bonus Rules
- [Earning and Using Bonuses](https://wholelifechallenge.kayako.com/article/22-earning-and-using-bonuses)
- [Complete Game Rules](https://wholelifechallenge.kayako.com/article/7-the-complete-and-illustrated-game-rules)
- [Nutrition Levels Guide](https://www.wholelifechallenge.com/how-to-choose-your-whole-life-challenge-nutrition-level/)

### Recovery / Wellness Metrics
- [WHOOP Recovery](https://www.whoop.com/us/en/thelocker/how-does-whoop-recovery-work-101/)
- [Oura Readiness Score](https://support.ouraring.com/hc/en-us/articles/360025589793-Readiness-Score)
- [MindScape: Contextual AI Journaling (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11275533/)

### AI API Pricing
- Gemini 2.0 Flash: $0.10/$0.40 per million tokens, free tier ~1,000 req/day
- GPT-5 Nano: $0.05/$0.40 per million tokens
- Claude Haiku 4.5: $1.00/$5.00 per million tokens

### Internal References
- Theme system: `src/styles/theme.js`
- Layout constraints: `src/components/Layout.jsx:38` (maxWidth: 480)
- Exercise card: `src/components/habits/ExerciseCard.jsx`
- Hydrate card: `src/components/habits/HydrateCard.jsx`
- Scoring system: `src/lib/scoring.js`
- Admin config: `src/lib/adminConfig.js`
- AuthGate splash: `src/components/AuthGate.jsx`
