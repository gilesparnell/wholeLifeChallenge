# Changelog

All notable changes to the WLC tracker. The version shown in the app footer (`vX.Y.Z (sha)`) and on `/health` matches the entries below.

## Conventions

### Versioning

- **patch** (`0.0.x`) — bug fixes, copy tweaks, dependency bumps
- **minor** (`0.x.0`) — new features, new pages, new tracked events
- **major** (`x.0.0`) — breaking changes (rare for an internal app)

### Entry format

Each entry is split into:

- **What's new** — customer-facing outcomes in plain language. What you'll notice, feel, or ask about.
- **Under the hood** — technical detail for future-me debugging. Rendered in a dimmer style on the `/changelog` page so the user-facing content dominates.

### When to create a new entry vs. extend an existing one

- **New entry** for a new user-visible feature, or a bug fix in something that's been stable for weeks/months.
- **Extend the previous entry** (update the heading to a version range like `[0.10.0 → 0.10.3]`) when a PR fixes or polishes something shipped within the same development burst — roughly the last ~72 hours. The range tells the story of multi-stage delivery without cluttering the history with "fixing the previous fix" entries.

`package.json` still bumps on every PR so the footer always shows the exact deploy. The CHANGELOG collapses related churn into a single narrative.

---

## [0.22.5] — 29 Apr 2026 — Days logged count in header

### What's new
- Under the "Day X / 75" header you'll now see **(X of Y days logged)** — so you can tell at a glance how many challenge days you've actually checked in, vs. how many days have elapsed.

### Under the hood
- `countDaysLogged(data, dayIndex)` extracted as a tested pure function in `stats.js` (6 unit tests). Replaces the inline duplicate in `CheckIn.jsx`'s profile-sync effect.
- `Layout.jsx` now imports `useData` to compute and display the days-logged count below the day header.
- `Layout.test.jsx` mock updated to include `data: {}`.

---

## [0.22.1 → 0.22.4] — 24 Apr 2026 — Check-in UX + swipe + bonus tracker + celebration

### What's new
- The date / "Today" label on the check-in screen is larger and bolder — easier to read at a glance.
- Mac trackpad horizontal swipe to change day is fixed: the gesture is now captured more reliably, even when the initial motion is slightly diagonal.
- Bonus Tracker is confirmed correct: "0/X to next" means you've already earned a bonus and are building your next streak — it resets to zero when a bonus is earned, then counts back up as you log each day. This is expected.
- **Bonus celebration overlay** — when you earn a bonus (Indulgence, Rest Day, Night Owl, Free Day) a full-screen animation fires with the bonus icon, a confetti burst, and a custom headline. Multiple bonuses queue so none are skipped. Auto-dismisses after 6 s; tap anywhere or press Esc to dismiss early.

### Under the hood
- `CheckIn.jsx` date button: `fontSize 14 → 18`, `fontWeight 600 → 700`.
- Swipe fix: replaced the per-event `|deltaX| < |deltaY|` filter with a `|deltaX| < 2` guard. The accumulator now receives all events with any horizontal component; `preventDefault()` is called on all of them, blocking browser back/forward from stealing the gesture. Direction validation (`HORIZONTAL_DOMINANCE_RATIO`) runs at flush time on the accumulated total, which is more robust than per-event filtering.
- 13 new bonus tracker unit tests: new entries format (`{ completed, entries }` v0.14.0+), streak rebuild after earning, unlogged-day breaks streak, `freeDay` bonus counts toward next free day streak, sleep/exercise `null` and format edge cases. All 67 bonus tests pass.
- `BonusCelebration.jsx` — React portal (z-index 4000). 32-piece confetti burst using a 3-stop linear keyframe for parabolic arc physics; mixed rectangle/circle shapes with alternating spin and flip. Shimmer sweep, breathing spotlight, ambient icon glow, spring card entrance. Card `overflow` removed so confetti escapes into backdrop. `detectNewBonuses()` + `bonusEarnedKey` stable string diff drives the queue; 12 unit tests.
- Dev-only test button (`import.meta.env.DEV`) in CheckIn for triggering all 4 celebrations. Strip automatically in production builds.
- Bug fix: celebration no longer fires on every login for previously-earned bonuses. `useBonusCelebration` hook skips detection while `loading=true`; baseline is established only once real data arrives. 9 regression tests.
- "Patterns we're seeing" (correlation insights) moved from the Insights section to the bottom of Habit Trends — it belongs with the habit data it summarises.

---

## [0.22.0] — 23 Apr 2026 — Progress page layout + mobile habit grid

### What's new

- **Progress page reorganised** from 12 sections down to 6: Scores & Progress, Habit Trends, Exercise & Movement, Wellness, Recovery, Insights. Related charts now live together — no more hunting across separate sections.
- **Habit Trends** groups Habit Consistency, Day-by-Day Log, Habit Breakdown chart, and Habit Heatmap in one place.
- **Day-by-Day Habit Log** now fits on iPhone without horizontal scrolling — cells are smaller and column headers use emoji icons (🥗 for nutrition, ⭐ for score).

### Under the hood

- `HabitGrid.jsx`: cell size reduced from 34×34px to 26×26px; header `thStyle` uses emoji at 14px instead of text abbreviations; table `minWidth` removed so layout is fluid.
- `Progress.jsx`: 12 `CollapsibleSection` blocks collapsed to 6. Exercise & Movement section wraps both `hasExerciseDuration` and `activityBreakdown` in a single conditional. Recovery section now includes `RecoveryStrainScatter`. Insights section absorbs CalendarHeatmap and RadarWeek from the former Deep Dives section. Weekly Totals moved inside Scores & Progress.

---

## [0.21.0] — 23 Apr 2026 — Collapsible Progress page sections

### What's new

- The **Progress page** is now organised into collapsible sections — tap any section heading to collapse or expand it. Your preferences are remembered across sessions: sections you close stay closed and sections you leave open stay open permanently (stored per-section in localStorage).
- Open by default: **Scores**, **Day-by-Day Habit Log**, **Habit Consistency**. Closed by default: Wellness, Habit Breakdown, Exercise, Activity Types, Recovery & Strain, Deep Dives, Habit Heatmap, Weekly Totals, Insights.

### Under the hood

- `src/components/CollapsibleSection.jsx` — minimal section accordion. `readSectionOpen` / `writeSectionOpen` persist to `localStorage` under `wlc-progress-open-{id}`. 8 unit tests. Progress.jsx wraps each chart group in `<CollapsibleSection>` with a `defaultOpen` matching its daily relevance.

---

## [0.20.0] — 23 Apr 2026 — Yesterday's gaps card + day-by-day habit grid + consistency analysis

### What's new

- A dismissible card now appears at the top of Check-In whenever you have habits you didn't log yesterday. Each missed habit has two options: **"Yes, log it"** (takes you to yesterday so you can fill it in) or **"Nope"** (removes just that gap from the card). The card remembers your dismissals so it won't re-appear after a page refresh.
- Two new sections in Progress:
  - **Day-by-Day Habit Log** — a full grid showing every day × every habit with colour-coded cells. Nutrition cells show your 0–5 score with a green gradient; habit cells show ✓ in their habit colour when done; partial hydration shows the fill percentage in amber. Filter to 1D / 7D / 14D / All with the pill buttons at the top. Horizontally scrollable on mobile with the date column pinned.
  - **Habit Consistency** — per-habit completion rates and points lost across all logged days. Any habit below 60% completion gets an orange callout naming exactly how many points you've lost there (e.g. "Mobilise: only 2 of 12 days — 50 pts lost"). Hydrate also calls out your average ml vs your target if you're consistently falling short.

### Under the hood

- `src/lib/yesterdayGaps.js` — `getYesterdayGaps(data, yesterday, dayIndex)` checks `bonusApplied` (restDay/nightOwl/freeDay/indulgence) before adding a habit to the gaps list. 10 unit tests.
- `src/lib/progressMetrics.js` — new `calculateHabitConsistency(data, allDates, dayIndex)` returns per-habit completionRate, pointsLost, and hydrate-specific avgMl/avgTarget/avgFillRate. 6 unit tests appended.
- `src/components/YesterdayGapsCard.jsx` — dismissal persisted to `localStorage` under `wlc-gaps-dismissed-{date}`; `onAllDismissed` fires once the active-gaps array empties.
- `src/components/progress/HabitGrid.jsx` — range filter slices `allDates` client-side; sticky date column via `position: sticky, left: 0`; partial-hydrate amber cell uses `current_ml / target_ml` ratio from the day's hydrate object.
- `src/components/progress/HabitConsistencyPanel.jsx` — 60% threshold drives both bar colour and callout inclusion; hydrate gets a secondary callout when `avgFillRate < 60`.
---

## [0.19.1 → 0.19.2] — 23 Apr 2026 — Trackpad swipe fixed on macOS + scoring breakdown in leaderboard

### What's new
- Two-finger horizontal swipe to navigate days now works again on macOS trackpads.
- The leaderboard ⓘ info modal now includes a full scoring breakdown table — 35 pts/day, what each category earns, and how to earn it (including the note that Hydrate requires hitting 100% of your water target, no partial credit).

### Under the hood
- Replaced the React `onWheel` synthetic event with a native non-passive `wheel` listener (`addEventListener('wheel', fn, { passive: false })`). Without `passive: false`, macOS intercepts horizontal swipes as browser back/forward navigation gestures before wheel events reach the page. Calling `e.preventDefault()` on horizontal-dominant events blocks that interception. Touch/iPhone swipe is unaffected (separate touch path). `CheckIn.jsx:132–149`.
- Added inline-styled `<table>` to the `<Help>` children in `Leaderboard.jsx` — no changes to the Help component itself.

---

## [0.19.0] — 23 Apr 2026 — Preserved display names + Google account picker

### What's new

- **Renamed accounts stay renamed.** When the admin edits someone's display name (e.g. "Giles Parnell" → "Giles Parnell (PR)"), the change now sticks. Previously the next time that user signed in with Google, the display name was silently overwritten with whatever Google had on file, so admin edits quietly disappeared.
- **Switching Google accounts now works.** Signing out and signing back in was silently re-using whichever Google account was last active in the browser, with no way to pick a different one. Google's account chooser now appears on every sign-in, so you can switch between multiple accounts on the same device.

### Under the hood

- **`src/lib/profiles.js` — `upsertProfile` no longer overwrites `display_name` on returning sign-ins.** Split into explicit insert / update paths: SELECTs first to check if the row exists, then either INSERTs (first-time user, sets display_name from Google OAuth full_name or email local-part) or UPDATEs only `last_login_at` + `avatar_url` + `email` (never display_name). Admin and user-initiated display-name edits now survive the next sign-in. Tests rewritten to cover both branches + display-name-preservation assertion + error paths for both insert and update.
- **`src/contexts/AuthContext.jsx` — `signIn` passes `prompt: 'select_account'`** as a Google OAuth `queryParams` option. Forces Google's consent screen to render its account chooser on every sign-in, even when the browser has an active Google session. One new AuthContext test pins the expectation.
- Test suite: 985 → **989 tests, all passing** (+4 across display-name preservation + account-picker).

---

## [0.18.0 → 0.18.7] — 23 Apr 2026 — Update toast summary + shareable changelog links

### What's new

- **Know what changed before refreshing.** The little “New version available” toast at the bottom of the screen now shows the version number and a one-line release title. If you want the detail, tap “See what’s new →” to jump straight to that version’s entry on the Changelog page; otherwise just tap Refresh. No long bullet lists in the toast itself — previously the toast got uncomfortably tall when a release had a lot of changes (0.18.1).
- **Each version on the changelog page is now its own shareable link.** Every version heading on `/changelog` has a small “🔗 link” button beside it — tap it to copy a deep link like `/changelog#0.16.0` to your clipboard. Paste that link in a chat or email and the recipient lands directly on that version’s entry, scrolled into view. URL fragments work end-to-end on first load too, so an inbound link to `/changelog#0.15.1` jumps straight to it.
- **The Close button on the changelog is now unmissable on mobile (0.18.7).** On the installed mobile app there's no browser back arrow, so the little × in the corner was the only way out — and on iOS it was hiding behind the status-bar notch area. The Close button now floats fixed in the top-right corner with a proper pill background, a visible "Close" label, and safe-area-aware positioning so it's always visible and tappable regardless of scroll position or device chrome.
- **Changelog page now matches the rest of the app (0.18.6).** Making the page public in 0.18.2 had a side effect — it no longer sat inside the app's Layout wrapper, so it rendered with the browser default font and a bright/unstyled background. It now applies the same dark background, the same body font (Outfit/DM Sans), and the same centred max-width column the rest of the app uses.
- **Bold and inline-code formatting now render on the changelog page (0.18.5).** Previously every `**bold phrase**` was showing up as literal asterisks + text, and inline `` `code` `` backticks rendered raw too. Both now render as proper bold and code-styled spans so the release-notes prose reads the way it was written.
- **Changelog reads cleanly again (0.18.3).** The page had been showing raw HTML entity codes (the `&...;` sequences that stand in for curly quotes, em-dashes, ellipses, and arrows) as literal text instead of the punctuation they represent. All 100-odd of those in existing entries have been replaced with the real Unicode characters, and the in-app markdown parser now decodes them automatically so a future accident can’t regress this.
- **Changelog deep links now work for people who aren’t signed in (0.18.2).** Previously a recipient clicking a shared `/changelog#X.Y.Z` link would hit the sign-in screen first, and after signing in with Google the URL fragment was gone — they’d land on the check-in page with no way to find the version you were trying to show them. Changelog is now a public route so it opens directly, no account required. The “Close” button falls back to home when there’s no previous page to return to. `/health` is now public for the same reason.

### Under the hood

- **`src/lib/changelogVersionSlug.js` (new)** — `extractVersionSlug(headingText)` returns the last version string from a `[X.Y.Z]` or `[X.Y.Z → X.Y.Z+n]` bracket, and `extractVersionHeadingParts(headingText)` separates `{version, range, date, title}`. 9 unit tests pin happy-path / range / ASCII-arrow / null-input cases.
- **`src/lib/getLatestWhatsNew.js` (new)** — walks the parsed changelog, finds the first h2 with a version slug (skipping the `## Conventions` block), then collects bullets only from a sibling `### What’s new` h3 until the next h2 or `---`. Returns `{version, title, items, hasMore}` with a `maxItems` cap (default 3). 10 unit tests cover what’s-new isolation, truncation, hasMore signalling, and null/empty input.
- **`src/components/UpdateToast.jsx`** — gains a `summary` prop. When present, lays out as a card: bold version header (`New version available — vX.Y.Z`), dim title line, then a 12px bullet list. Falls back to the original single-line toast when `summary` is null. 6 new unit tests pin the layout matrix.
- **`src/App.jsx`** — computes `LATEST_WHATS_NEW = getLatestWhatsNew(CHANGELOG_TEXT)` once at module load (changelog text rebuilds with every deploy, so it always matches the version about to be served) and passes it as `summary` to `<UpdateToast>`.
- **`src/pages/Changelog.jsx`** — every version `<h2>` now renders with `id={versionSlug}` so URL fragments resolve to the right element, plus a 🔗 link button beside the heading that writes `${origin}/changelog#${slug}` to the clipboard via `navigator.clipboard.writeText`. A new `useEffect` reads `location.hash` on mount and calls `scrollIntoView({behavior:'smooth'})` after a `requestAnimationFrame`, so deep links scrolled-into-view work on first load (browsers don’t auto-scroll for SPA route renders with a fragment). 4 new Changelog tests pin the `id` attribute, the copy-link affordance, the clipboard call, and the no-anchor behaviour for the Conventions h2.
- Test suite: 922 → **951 tests, all passing** (+29 across both features). No new dependencies.
- **0.18.7 — visible fixed-position close button.** Close button on `/changelog` is now `position: fixed` with `top/right: calc(env(safe-area-inset-*) + 12px)` so it sits clear of the iOS status bar. Styled as a rounded pill with surface background + 1px border + 25% drop shadow, minHeight 36px to meet the touch-target guideline, z-index 2000 so it's always on top. Includes the "Close" text label beside the × glyph — the bare × was too easy to miss on mobile. `aria-label` stays `"Close changelog"` so existing accessibility + Vitest assertions (`getByRole('button', {name: /close changelog/i})`) keep working. CSS/JSX-only — no logic, no tests added. Suite 985 → **985, all passing**.
- **0.18.6 — public-page chrome for the changelog.** `src/pages/Changelog.jsx` now wraps its output in a full-viewport div that applies `background: colors.bg`, `color: colors.text`, `fontFamily: fonts.body`, and `minHeight: 100vh`, plus an inner `.wlc-public-page` container that mirrors Layout's responsive max-width breakpoints (480px / 720px / 960px) and safe-area insets. Purely visual — no logic change, no test change required (CSS-only per the tdd-first exception list). Fixes the bare-browser-defaults look on /changelog after 0.18.2 moved the route outside `<Layout>`.
- **0.18.5 — inline markdown in the changelog renderer.** New pure utility `src/lib/parseInlineMarkdown.js` tokenises a string into `{type: 'text' | 'bold' | 'code', text}` spans, with these rules: code spans (`` `…` ``) take priority and their contents are not re-tokenised so `` `**x**` `` renders as literal `**x**` inside a code block; bold spans (`**…**`) match only when properly closed with non-empty contents; unclosed or empty delimiters are left as literal text so malformed markdown fails soft. 15 unit tests cover the matrix (plain, bold, code, multiple spans, unclosed, empty, inside-code, curly-quote preservation, em-dash neighbouring). New React component `src/components/InlineMarkdown.jsx` maps tokens to `<strong>` / `<code>` / `<span>` using the existing theme colours for code-span background + border. `src/pages/Changelog.jsx` `<Block>` renderer routes every h1/h2/h3/p/ul-item through `<InlineMarkdown>` instead of rendering raw strings. 2 new Changelog tests confirm the Conventions fixture now emits `<strong>` for "patch" / "What's new" and that the page has zero literal `**` markers. Full suite 961 → **985, all passing** (+24 across the new utility + component + integration assertions).
- **0.18.3 — HTML entity decode in the changelog parser.** `src/lib/parseChangelog.js` gains a `decodeEntities(text)` helper applied to every h1/h2/h3/paragraph/list-item string before pushing it into the block list. Supports the common named entities used by my writing style (`ldquo rdquo lsquo rsquo mdash ndash rarr larr hellip amp nbsp quot apos lt gt trade copy reg middot bull deg times check`), plus decimal (`&#8217;`) and hex (`&#x2019;`) numeric entities. Unknown entities are left intact rather than silently stripped. Separately, a one-shot sweep through `CHANGELOG.md` replaced 103 entity occurrences with their Unicode equivalents so the source markdown reads cleanly too. 9 new parser tests pin the decode table + the "leave unknown alone" behaviour + numeric/hex handling. Full suite 952 → **961, all passing**.
- **0.18.2 — public changelog route.** `src/App.jsx` was restructured so `/changelog` and `/health` render *outside* the `<AuthGate>` tree. Both routes now live in a top-level `<Routes>` sibling to the new `<AuthenticatedApp>` component which wraps `AuthGate + DataProvider + ActivityNotifier + OnboardingGate + Layout + authenticated-only routes`. Each public route is individually wrapped in `<Suspense fallback={<PageFallback />}>` since `Changelog` and `Health` stayed lazy-loaded. `Changelog.handleClose` now checks `window.history.length <= 1` and falls back to `navigate('/')` rather than a no-op `navigate(-1)`, for the case where someone lands directly on the page via a shared deep link. One new test in `Changelog.test.jsx` pins the fallback behaviour. Suite 951 → **952, all passing**.
- **0.18.1 — slimmed-down toast.** `UpdateToast` no longer renders the `<ul>` of “What’s new” bullets. It now shows: bold version header (`New version available — vX.Y.Z`), dim title line, and a `See what’s new →` `<a href="/changelog#<version>">` link pointing at the exact version’s anchor on the changelog page. Clicking the link is a real navigation (no `preventDefault`), so the browser hits the new bundle and the service-worker activation completes — the user lands on the changelog with the latest entry already scrolled into view. 3 existing “bullet” tests in `UpdateToast.test.jsx` replaced with: one asserting bullets are never rendered, one pinning the `/changelog#<version>` href, one covering the fallback when `summary` is null. Full suite 951 → **951 (unchanged count)**.

---

## [0.17.0 → 0.17.1] — 22 Apr 2026 — Exercise + mobility sharing

### What's new

- **Share your exercise and mobility activity too.** The Sharing section in **My Preferences** now has a third block: *Share my exercise & mobility activity*. Same shape as the others — per-person checkboxes for the people you trust, or a “with all active users” switch. Defaults to off; nothing changes unless you flip it.
- **Exercise insights appear inline on the Progress tab.** When you view a sharer who's opted into exercise sharing (with or without wellness), the compact view on Progress now shows their **activity types with total minutes** (e.g. Running 90 min, Swimming 60 min) and **weekly totals** split into exercise vs mobility. Wellness and exercise sections render independently — if someone shares only exercise, only that section appears; same for wellness-only.
- **The Progress selector is now labelled “Viewing insights”** (not “Viewing wellness”), since the compact view now covers both scopes. It still lists the union of everyone who's shared either wellness **or** exercise with you.
- **Nutrition, hydration, and reflections remain private** under the exercise scope. Reflections are still only visible through their own separate journal-sharing toggle.
- **You can now see which account you’re signed into (0.17.1).** The hamburger menu now shows a small “Signed in as …” header at the top with your display name (not your email). Handy when switching between accounts on the same device.

### Under the hood

- **`supabase/migrations/20260422000014_exercise_share_scope.sql`** — adds 'exercise' to the `entry_shares_scope_check` CHECK constraint and creates a new `shared_exercise_entries` curated view exposing `(owner_id, owner_name, date, exercise, mobilize)`. Same gating predicate as the other curated views: self OR explicit `entry_shares` row OR `profile.preferences.share_exercise_all = true`. **Manual apply** required post-merge.
- **`src/lib/adminConfig.js`** — `share_exercise_all: 'boolean'` added to `PREFERENCE_TYPES`, `PERSONALISABLE_KEYS`, and `DEFAULT_CONFIG` (default `false`). Tests pin coercion.
- **`src/lib/shareRepo.js`** — `SHARE_SCOPES` now includes `'exercise'`; `addShare` accepts it and rejects anything else.
- **`src/components/OwnerSelector.jsx`** — introduces a virtual `scope="insights"` that unions the `shared_wellness_entries` + `shared_exercise_entries` views, so a sharer appears in the Progress selector if they've granted **either** scope. Internally, the component now calls `Promise.all` across the mapped views and merges owner IDs via a `Map` to dedupe. 2 new unit tests pin the union + exercise-only selection.
- **`src/hooks/useSharedExercise.js` (new)** — thin wrapper over `shared_exercise_entries`, returns `{data, loading}` as a date-keyed map matching the existing `getActivityTypeBreakdown` / `getWeeklyExerciseMinutes` input contract. 4 unit tests.
- **`src/pages/Progress.jsx`** — shared-mode branch now calls both `useSharedWellness` and `useSharedExercise`, renders a wellness section and/or an exercise section independently based on which has data. Page heading flipped from *“Wellness Insights”* to *“Insights”* to reflect both scopes. Exercise section lists activity types (with `getActivityTypeBreakdown`) and weekly totals (with `getWeeklyExerciseMinutes`) — reusing the existing self-view helpers without modification. 3 new Progress tests cover the render-exercise / hide-exercise / hide-wellness paths.
- **`src/pages/MyPreferences.jsx`** — third share block (`scope: 'exercise'`) added to the block iterator; `shareExerciseAll` state derived from `values.share_exercise_all`. 3 new tests pin rendering, all-toggle persistence, and per-person `addShare` with `scope: 'exercise'`.
- Test suite: 904 → **918 tests, all passing** (+14 across exercise sharing). No new dependencies.
- **0.17.1 — HeaderMenu shows display name.** `src/components/HeaderMenu.jsx` accepts a new `displayName` prop and renders a `data-testid="header-menu-user"` block at the top of the dropdown: small uppercase “Signed in as” label + the display name in bold. Falls back to “You” if the name is missing. `src/components/Layout.jsx` pulls `profile?.display_name` from `useAuth()` and passes it through. 4 new unit tests cover render-with-name, no-email-leak, fallback, and hide-when-signed-out. Suite 918 → **922 tests, all passing**.

---

## [0.16.0 → 0.16.1] — 21 Apr 2026 — Custom sleep hours + opt-in sharing

### What's new

- **Log any sleep duration, not just 5–10 hours.** The Sleep card on Check In used to cap out at 5 hours as the lowest preset — which was a problem for any rough night that dipped below. Now there's a **Custom…** button beside the preset row. Tap it, type the exact hours (anything 0–24, half-hour increments), hit Save. Three hours of sleep? Nine and a half? Zero because you forgot? All logs correctly now. Preset buttons stay for the common values — the custom input is an addition, not a replacement.
- **Share your reflexion journal with specific people.** New toggle under **My Preferences → Sharing**. Pick exactly who sees your written reflections — one person, two people, or turn on the “everyone” switch if that’s simpler. Defaults to <strong>off</strong>; nothing changes unless you flip a toggle.
- **Share your wellness insights the same way.** Same shape, different scope — share sleep hours, wellbeing score, and the “How Do You Feel?” scales (mood, energy, stress, soreness). Nutrition, exercise, and hydration stay private either way.
- **View a friend’s shared data inline.** The Reflections tab and the Progress page both now have a “Viewing:” dropdown at the top. Default is you. If someone shares with you, their name appears in the dropdown; pick it to see what they’ve shared. For wellness, you land on a compact “Wellness Insights” view with their sleep and wellbeing charts — not the full Progress dashboard, since most of that isn’t shared.
- **Privacy note.** Reflections used to be strictly private — no toggle existed. That stays the default. The new surface is explicit opt-in, per-recipient, and revocable any time. Flipping a share off takes effect on the next page load for the viewer.
- **The “Viewing:” selectors are now always visible (0.16.1).** On both Reflections and Progress, a small dropdown at the top of the page shows where the switch happens — even if no one has shared with you yet. You’ll see “Viewing journal: Me ▾ — no one’s shared with you yet” on Reflections, and “Viewing wellness: Me ▾” on Progress. Previously the control was hidden until a share existed, which made it hard to know the feature was even there.

### Under the hood

- **`src/components/habits/SleepCard.jsx`** — adds a `Custom…` toggle beside the preset hour buttons. On press, reveals a `<input type="number" min="0" max="24" step="0.5">` with inline validation: out-of-range values block save and surface a “Enter 0–24 hours.” error; empty input blocks save; Enter saves; Escape cancels. Valid values flow through the existing `onChange({completed: true, hours})` contract — no change to `DataContext.saveDay` or the Supabase round-trip. 14 new tests cover preset clicks, the custom-mode toggle, range validation, keyboard handlers, the 0-hours edge, and header-copy reflexion of non-preset values.
- **`supabase/migrations/20260421000013_entry_shares_and_views.sql`** — new `entry_shares(owner_id, viewer_id, scope)` join table (scope `CHECK IN ('wellness','journal')`, `owner_id <> viewer_id`, cascading FK deletes to `profiles`, indexed on `(viewer_id, scope)`). RLS: `entry_shares_self_manage` for owners (USING/WITH CHECK `owner_id = auth.uid()`), `entry_shares_viewer_read` for viewers. Two curated views — `shared_journal_entries` exposes `(owner_id, owner_name, date, reflect)`; `shared_wellness_entries` exposes `(owner_id, owner_name, date, sleep, wellbeing, selfReport)`. Both run with definer privileges so their `WHERE` predicate is the sole gate: `owner = auth.uid()` OR `EXISTS entry_shares row` OR `profile.preferences.share_{scope}_all = true`. Plus a `list_shareable_profiles()` SECURITY DEFINER function returning `(id, display_name)` of active non-self profiles — matches the leaderboard pattern. Verification queries at the bottom of the migration file. **Manual apply step** post-merge: Supabase Dashboard → SQL Editor → paste → Run.
- **`src/lib/adminConfig.js`** — extends `DEFAULT_CONFIG`, `PERSONALISABLE_KEYS`, and `PREFERENCE_TYPES` with `share_wellness_all` and `share_journal_all` as `'boolean'` preferences (both default `false`). `sanitisePreferences` persists explicit `true`/`false` for both; tests pin the coercion.
- **`src/lib/shareRepo.js` (new)** — thin wrapper over `entry_shares`: `listShares(ownerId)`, `addShare({ownerId, viewerId, scope})` (upsert with `onConflict` on the composite key), `removeShare({ownerId, viewerId, scope})`. Rejects invalid scopes and self-shares before hitting Supabase.
- **`src/lib/profiles.js`** — adds `listShareableProfiles()` calling the new RPC.
- **`src/pages/MyPreferences.jsx`** — new “Sharing” section sitting between Notifications and Targets. Each scope (journal / wellness) renders a “Share with all active users” toggle (persists the boolean via the existing `updateProfile` path) and, when the all-toggle is off, a per-person checkbox list driven by `listShareableProfiles()`. Checkbox toggles upsert/delete rows in `entry_shares`. 9 new tests cover rendering, the reflected initial state, all-toggle persistence, per-person add/remove, and the “hide list when all is on” rule.
- **`src/components/OwnerSelector.jsx` (new)** — `<select>` dropdown parameterised by `scope`; queries the relevant `shared_{scope}_entries` view for distinct owners, prepends a “Me” option, hides itself via `display:none` when no sharers exist so self-only users see no chrome. 7 tests pin the distinct-sharer logic, self exclusion, onChange wiring, and error-path fallback.
- **`src/hooks/useSharedJournal.js` + `useSharedWellness.js` (new)** — fetch the caller-visible rows from the respective view, shape them as a date-keyed map matching the `useData()` contract so existing rendering code (Journal cards, SleepHoursChart, WellnessSparklines) can consume shared data without modification. Return `{data, loading}`. Gracefully return empty data when the owner id is null (viewing self — no fetch fires) or on error. 10 tests across both hooks.
- **`src/pages/Journal.jsx`** — mounts `OwnerSelector scope="journal"`, swaps between `useData()` (self) and `useSharedJournal(ownerId)` (sharer) via a `viewingOwnerId` state. Edit buttons and the “Score: N/35” footer are gated on `isSelf` so shared views stay read-only and don’t leak score. Empty-state copy adapts (“No reflections yet” vs “This person hasn’t shared any reflections yet”). 5 new tests layered on top of the existing suite.
- **`src/pages/Progress.jsx`** — early-returns a compact “Wellness Insights” view (selector + `SleepHoursChart` + `WellnessSparklines` + a privacy reassurance line) when `!isSelf`; the full Progress dashboard stays on when viewing self. Chart components are reused with no changes — they already render null when there’s insufficient data, so the “not shared yet” empty state falls out naturally from the shape of the data. New `Progress.test.jsx` file covers the self / compact-shared / empty / privacy-copy flows (5 tests).
- Test suite: 838 → **904 tests, all passing** (+66 across the new features). No new dependencies.
- **0.16.1 — always-visible owner selector.** Dropped the `display:none` gate in `src/components/OwnerSelector.jsx` that hid the whole control when `sharers.length === 0`. Now the control always renders with a single "Me" option and, when empty, a dim "— no one's shared with you yet" hint beside it. `Journal.jsx` and `Progress.jsx` each pass a distinct `label` prop ("Viewing journal" / "Viewing wellness") so the two selectors read unambiguously. 2 new unit tests pin the always-visible behaviour and the scope-specific label.

---

## [0.15.0 → 0.15.1] — 19 Apr 2026 — Edit past reflexions + swipe day navigation

### What's new

- **Edit any past reflexion.** The Reflections page now shows a small **Edit** button on every reflexion card for a day you've already lived through. Tap it to re-open the same writing sheet you used on Check In, with the existing text pre-filled — tweak, add, or rewrite, tap Save, and it's persisted straight away. Future-dated days (if any creep into view) stay read-only.
- **Swipe between days on Check In.** On mobile, drag horizontally across the Check In page to move backwards or forwards through days — swipe from right-to-left for the next day, left-to-right for the previous. The arrow buttons still work; swipe is just a faster gesture for one-handed use. Vertical scrolling is unaffected — the swipe detector only fires when the motion is clearly sideways.
- **Trackpad swipe now works on Mac (0.15.1).** Two-finger horizontal swipe on a Mac trackpad navigates days the same way a touch swipe does on mobile — swipe right on the trackpad to go back, left to go forward. Horizontal mouse-wheel scroll works too. Vertical scrolling still scrolls the page as expected.
- **Tap the date to jump back to today (0.15.1).** The date label in the middle of the Check In page header is now a button. Whichever day you're looking at, tap/click the label once and you're back on today without having to page through day-by-day.

### Under the hood

- **`src/pages/Journal.jsx`** — adds `editDate` state + `<ActivityModal>` reuse. Each past-reflexion card renders an Edit button gated by the same `canEdit` rule CheckIn uses (`getDayIndex(d) >= 0 && getDayIndex(d) <= dayIndex && getDayIndex(d) < CHALLENGE_DAYS`). On save, `saveDay(date, { ...currentDay, reflect: { completed, reflection_text }, reflection })` matches CheckIn's handleModalSave payload exactly so the Supabase round-trip + in-memory shape stay identical. `visibleDates.reverse()` was also switched to `visibleDates.slice().reverse()` to stop mutating the memoised array from `getAllDates()`.
- **`src/lib/swipe.js` + test** — pure classifier: `detectSwipe(startX, startY, endX, endY)` returns `'left' | 'right' | null`. Minimum horizontal distance is 50px; horizontal must be ≥ 1.5× vertical or we treat the motion as a scroll and bail. 7 unit tests pin the truth table (clean swipes, under-threshold, diagonal-but-horizontal-dominant, mostly-vertical scroll, zero motion, exact-boundary).
- **`src/pages/CheckIn.jsx`** — extracts `shiftDate`, `goToPrevDay`, `goToNextDay` (identical arithmetic to the previous inline arrow-button handlers), wires them to both the arrows and the new `onTouchStart` / `onTouchEnd` on the page-root `<div>`. `useRef` holds the start coords so no re-render fires on every touchmove. Arrow buttons now carry `aria-label="Previous day" / "Next day"` while we were in there. No dependencies added.
- **`src/pages/Journal.test.jsx`** — 4 new tests: Edit button renders per editable reflexion, modal opens pre-filled, save dispatches the right `saveDay` payload, overlay click cancels without saving. Existing empty-state + heading tests preserved.
- Test suite growth on top of 0.14.4's 821 → **832 tests, all passing** (+11 across the swipe helper + Journal edit flow). Bundle impact is negligible — `swipe.js` is a single exported function with no state.
- **0.15.1 — trackpad swipe + date-to-today.** New `createWheelSwipeDetector({ onSwipe, quietMs })` factory in `src/lib/swipe.js` coalesces a burst of `wheel` events (one gesture on a Mac trackpad fires dozens) by accumulating deltas and flushing to `detectSwipe(0, 0, accX, accY)` after `quietMs` of inactivity — so a single two-finger swipe registers as one day-nav, not N. `CheckIn.jsx` attaches `onWheel` to the page root, skips the event when `|deltaY| ≥ |deltaX|` so vertical scroll stays untouched, and holds the detector in a `useRef` (initialised inside a mount-only `useEffect` to satisfy React 19's `react-hooks/refs` rule). Navigation handlers route through a `navRef` updated every render so the detector's once-captured `onSwipe` closure always sees the current `selectedDate`. The date label in the date-selector row is now a `<button>` that resets `selectedDate` to today — `aria-label="Jump to today"`, same visual styling. 6 new unit tests with `vi.useFakeTimers()` pin the burst-accumulation truth table (single burst fires once, direction correctness, vertical-dominated ignored, under-threshold ignored, debounce extends on mid-gesture deltas, re-arm after fire). Suite 832 → **838 tests, all passing**. Bundle +~200 bytes gzipped.

---

## [0.14.0 → 0.14.4] — 19 Apr 2026 — Multi-activity exercise logging

### What's new

- **Log more than one exercise per day.** The Exercise card on Check In now lets you stack multiple activities — swim 30 min, then run 20 min, then gym 45 min. Each entry shows on its own row with type and duration; tap × to remove any one. A summary line shows the total minutes and number of activities at the top of the card ("Total: 1h 35m \u00B7 3 activities").
- **The same applies to Mobilise.** Same card layout, same "+ Add another" affordance.
- **Old data still reads correctly.** Days you logged before this update show as a single-entry list. Nothing was lost. Editing such a day re-saves it in the new shape automatically.
- **Activity celebrations stay calm.** When you log multiple exercises in a single day, only the FIRST one fires a "Someone special has just completed …" notification to the rest of the group — adding extras later is silent so the group's devices don't keep pinging.
- **Progress totals now sum across entries.** The weekly minutes chart, the activity-type breakdown, the daily duration trend, the recovery × strain calculation — all of them now add up everything you logged that day, not just the first entry.
- **/changelog page is less cluttered (0.14.1).** The dense "Conventions" preface (versioning rules, entry format, when to extend a range) used to take up the entire first scroll of the page. It's now collapsed behind a single small **Conventions** link near the top — tap it to open a modal with the same content. The latest version entry sits at the top of the page where it should.
- **Notifications now keep firing for every activity (0.14.2).** You logged exercise → got a ping → logged hydration → got nothing. iOS Web Push silently merges follow-up notifications into the previous one's slot unless we explicitly tell it "this is a fresh alert". Every notification now carries the `renotify: true` flag so iOS re-alerts on every call, and self-notify test pings get a per-call timestamp on their tag so iOS treats each one as new.
- **"How Do You Feel?" now actually remembers (0.14.4).** Tapping a mood / energy / soreness / stress / sleep-quality value used to save to the device but quietly drop before reaching the cloud, so switching to another day and back wiped the selection. Every scale now round-trips properly — values stay put across day navigation, tab reloads, and re-opening the app tomorrow. Same fix applies to the Free Day bonus: activating it on a past day no longer evaporates on refetch.

### Under the hood

- **No migration required.** `daily_entries.exercise` is JSONB; the change is shape-of-payload only. Pre-0.14.0 rows have `{completed, type, duration_minutes}`; new saves emit `{completed, entries: [{type, duration_minutes}]}`. Readers go through new helpers in `src/lib/habits.js` (`getExerciseEntries`, `getTotalExerciseMinutes`) that normalise both shapes — old rows render forever, no destructive backfill.
- **`emptyDay()` change.** `exercise` and `mobilize` now start as `{ completed: false, entries: [] }`. Single test in `src/lib/scoring.test.js` updated to match the new shape.
- **Downstream readers updated.** `src/lib/exerciseStats.js` (`getDuration`, `getActivityTypeBreakdown`) and `src/lib/recovery.js` (`calculateStrainScore`) now sum across the entries array. Per-entry intensity is honoured in strain calculation — a HIIT entry contributes more than a Yoga entry of the same duration. `src/lib/progressMetrics.js` correlation pipeline reads minutes via the helper; the existing single-entry shape continues to feed the same correlation pair.
- **Broadcast contract preserved.** `src/lib/activityNotifications.js` `flipPayload` reads `exerciseType` and `durationMinutes` from `entries[0]` (falls back to legacy top-level fields). The flip detector still keys on `exercise.completed: false → true` — adding a second entry while `completed` is already `true` produces no broadcast. Regression test added.
- **`src/components/habits/ExerciseCard.jsx` rewritten.** Three modes: `idle` (shows summary + entries + "+ Add another"), `picking-type`, `picking-duration`. On confirm it emits the full new entries array with `completed = entries.length > 0` as the writer invariant. Backward-compat read for legacy rows: a single-entry shape renders correctly and edits save in the new format.
- **Test suite growth** — 760 tests after 0.13.1, **804 tests after 0.14.0** (+44 across the multi-activity work: helpers in `habits.test.js`, recovery + exerciseStats multi-entry blocks, activityNotifications multi-entry block, ExerciseCard rewrite, progressMetrics multi-entry assertions). Wire-level changes in 2 of 5 source files were caught by RED-then-GREEN cycles, not by accident.
- **No new dependencies, no schema change, no service-worker change.** Plan: `docs/plans/2026-04-19-002-feat-ios-push-viewport-multi-activity-beta-plan.md`.
- **0.14.1 — collapsible Conventions on /changelog.** New `src/lib/splitConventionsBlocks.{js,test.js}` walks the parsed block array and slices out the Conventions h2 + body up to (but not including) the next `hr` or `h2`. `src/pages/Changelog.jsx` renders a `Conventions` `<button>` styled as a link instead of inlining the content; clicking opens a bottom-sheet modal (same idiom as `ActivityModal`) with the conventions blocks rendered through the same `Block` component. Backdrop click + × button both close. 6 unit tests for the splitter + 5 page tests covering link visibility, body-not-inlined, modal open/close paths.
- **0.14.2 — iOS notification re-alert + unique self-notify tags.** `src/lib/browserNotifications.js` now passes `renotify: true` into both the `ServiceWorkerRegistration.showNotification(...)` and the constructor paths. iOS Web Push's default behaviour silently replaces a same-tag notification without re-alerting, which is why follow-up activity celebrations went missing in 0.14.1. `src/contexts/DataContext.jsx` self-notify echo now appends `Date.now()` to the tag (`wlc-activity-exercise-20260419-1776576430066`) so each test ping is treated as a brand new notification, sidestepping the dedup entirely. Cross-tab dedup for the broadcast subscriber is unaffected — that path still uses the per-day tag. 2 new tests (renotify pass-through + per-call tag uniqueness).
- **0.14.3 — test-suite streamline (developer-only).** 26 pure-logic test files in `src/lib/` + the `viewport.test.js` smoke check now carry a `// @vitest-environment node` directive, opting them out of the jsdom environment they don't need. Cumulative environment-setup time across workers dropped from ~1040 s to ~162 s (≈6.5×), measured on a sequential `--no-file-parallelism` run. Files that genuinely need DOM/global APIs (adminConfig + dataStore use `localStorage`; browserNotifications + serviceWorker use `navigator`/`Notification`; everything in `.test.jsx`) stay in jsdom. No behavioural change. Suite still 817 tests, all passing.
- **0.14.4 — selfReport + bonusApplied now round-trip through Supabase.** Root cause: `src/lib/supabaseStore.js` `HABIT_KEYS` was frozen at the v2 Phase 1 list (`nutrition, exercise, mobilize, sleep, hydrate, wellbeing, reflect`) and never updated when v3 Phase 3 added the `selfReport` field (the "How Do You Feel?" scales) or when Phase 2 added `bonusApplied` (Free Day / Indulgence / Rest Day / Night Owl flags). Both `rowToEntry` (read path) and `entryToRow` (write path) iterate `HABIT_KEYS`, so every cloud save silently stripped those two fields. LocalStorage + in-memory React state still held them, which is why a same-session hit looked fine — but any Supabase refetch (page reload, tab foreground, re-auth) overwrote state with the stripped cloud copy. Fix: both keys added to `HABIT_KEYS`, plus a migration (`20260419000012_selfreport_and_bonusapplied_columns.sql`) adding the two JSONB columns to `daily_entries`. Migration is idempotent (`IF NOT EXISTS` gates), `bonusApplied` defaults to `'{}'::jsonb` for a no-backfill roll-out, `selfReport` stays nullable (rowToEntry falls back to DEFAULTS.selfReport = null, which CheckIn already handles via `currentDay.selfReport || {}`). Migration MUST be applied in the Supabase dashboard BEFORE this version deploys — once the new code ships, every upsert includes both columns and PostgREST will 400 any save if the columns don't exist yet. 4 new regression tests in `src/lib/supabaseStore.test.js` pin both round-trip directions for both keys. Suite now 821 tests, all passing.

---

## [0.12.0 → 0.13.2] — 19 Apr 2026 — "Someone special" activity notifications

### What's new

- **Someone special has just completed …** — when anyone else in your challenge finishes their exercise, well-being, or daily reflexion, or hits their hydration target, your device gently pings with a quiet celebration. The person isn't named (we all know who the "someone special" is), and neither the activity text nor the reflexion content is ever included — the notification is just the headline, nothing more. Exercise celebrations include duration and type: "Someone special has just completed 30 min of Running".
- **Notifications are on by default.** A new toggle on the My Preferences screen lets you opt out any time. The first time you visit the page after this update, a small "Grant browser permission" button will appear — that's the one-click step needed to actually let your browser deliver the pings.
- **Only today's wins fire.** If you go back and tick something on yesterday's check-in, nobody gets pinged — the feature celebrates activity as it happens, not historical cleanups.
- **Foreground only for now.** Notifications only land when you've got the app open in a tab or installed as a PWA. A follow-up release will layer on true background delivery via the service worker.
- **New "Also notify me of my own activity" toggle (0.13.0).** A second switch inside the Notifications card on My Preferences echoes your own completions back to your own device. Off by default — this is a solo-QA helper so you can verify the feature works without needing a second person signed in on another browser.
- **Auto-recovery after app updates (0.13.0).** When a new deploy shipped and an old tab still held the previous `index.html` with stale chunk filenames, the app used to crash with a cryptic "'text/html' is not a valid JavaScript MIME type" error. It now detects that failure mode, unregisters the stale service worker, and reloads itself once so the fresh build takes over. Only falls back to the manual error screen if the reload also fails, preventing loops.
- **Self-notify fixes + "Send test notification" button (0.13.1).** Flipping the "Also notify me of my own activity" toggle on now requests browser permission in the same click when permission was still `default` (previously the toggle silently persisted but nothing fired because showNotification no-ops without granted permission). A new "Send test notification" button on the Notifications card fires a one-shot test ping whenever permission is granted — no activity required, so you can verify your browser/permission setup in one tap. Shows a "Sent — check your device" confirmation or a "Couldn't send" hint if the browser blocked the call.
- **iOS PWA notifications actually fire now (0.13.2).** The "Send test notification" button and activity celebrations both silently failed on iOS PWAs because Apple's Web Push implementation does not display notifications created via the page-context `new Notification(...)` constructor — it requires the service-worker path. The app now prefers `ServiceWorkerRegistration.showNotification(...)` when a service worker is active, with a 2-second timeout + constructor fallback for desktop browsers and old dev environments where no SW is registered. Works identically across Chrome, Safari, Firefox, Android, and iOS 16.4+ PWAs.
- **Viewport lock in the installed PWA (0.13.2).** Pinch-zoom and chrome drag-scroll are now disabled inside the installed standalone PWA — the app feels like a native shell. Interior scrollable regions (Progress page charts, Journal list) still scroll normally. Implemented via `maximum-scale=1.0, user-scalable=no` on the viewport meta plus `touch-action: manipulation` on the root (complementing the existing v0.10.4 `overscroll-behavior: none` rubber-band fix).

### Under the hood

- **No migration required.** The opt-out preference lives inside the existing `profile.preferences` JSONB under a new `notificationsEnabled` key (default `true`). `src/lib/adminConfig.js` gains a `PREFERENCE_TYPES` map so `sanitisePreferences` can coerce booleans without the numeric range-check path. `PERSONALISABLE_KEYS` picks up `notificationsEnabled`.
- **`src/lib/activityNotifications.js`** — pure helpers: `detectActivityFlips(prevDay, nextDay)` diffs two `dayData` objects and returns any activity that flipped from incomplete to complete, scoped to the four watched habits (exercise, wellbeing, reflect, hydrate); `composeMessage(flip)` returns the notification `{title, body}` with the fixed user-facing copy; `tagFor(flip, dateISO)` produces an OS-dedupable notification tag. 29 unit tests covering the full truth table of flips + composition fallbacks.
- **`src/lib/browserNotifications.js`** — thin feature-detected wrapper around `window.Notification`. `isNotificationSupported`, `getPermission`, `requestPermission`, `showNotification`. Swallows constructor failures and unsupported environments (SSR, older Safari, jsdom) silently. 11 unit tests.
- **`src/lib/activityBroadcaster.js`** — singleton Supabase Realtime broadcast-channel holder for `activity-celebrations` with `config.broadcast.self = false` so the sender never receives its own messages. `sendActivity(flip, supabase)` is fire-and-forget and safe against a null client. 11 unit tests.
- **`src/contexts/DataContext.jsx`** — `saveDay` now captures the previous `dayData` via a ref, detects flips, and fires a broadcast for each flip, gated on: non-local user, supabase client present, `date === getToday()` (back-dated edits are silent), and `profile.preferences.notificationsEnabled !== false`.
- **`src/components/ActivityNotifier.jsx`** — headless subscriber mounted inside `<AuthGate><DataProvider>`. Subscribes to the shared channel while the user is signed in, not in local mode, and has not opted out; tears down on unmount, sign-out, or preference flip-off. On each broadcast it re-checks browser permission (so a mid-session revoke is respected), calls `composeMessage`, and routes to `showNotification`. 11 component tests including the full subscribe / unsubscribe / permission-revoked lifecycle.
- **`src/pages/MyPreferences.jsx`** — new Notifications card rendered above the existing Targets group. Toggle persists immediately via `updateProfile` rather than waiting for the Save button. Clicking the toggle ON when permission is still `default` fires `requestPermission()` from that click (valid user gesture). A "Grant browser permission" button appears whenever the preference is ON and permission is `default`; a dim helper replaces it on denied. Analytics: new `notifications_toggled` event. 9 new tests.
- **Architecture note — why realtime-only, not Web Push.** True background Web Push needs VAPID keys, a Supabase Edge Function triggered by a database webhook, a subscription table, and a `push` listener in the service worker. For a four-user whitelisted app this was excessive. The broadcast-channel approach ships zero new dependencies, no schema change, no secrets, and works across Chrome / Safari / Firefox desktop + iOS PWA while the app is in the foreground. The broadcast payload is deliberately shaped so a future Web Push edge function can drop in as a second source without changing the subscriber.
- **Test suite growth** — 653 tests after 0.11.0, **739 tests after 0.12.0**, **752 tests after 0.13.0** (+99 tests overall across 6 new test files and several extended).
- **0.13.0 — self-notify echo.** `src/lib/adminConfig.js` gains a `notifyOnOwnActivity` boolean preference in `PERSONALISABLE_KEYS` + `PREFERENCE_TYPES`. `src/contexts/DataContext.jsx` echoes each flip to `showNotification` locally when the preference is true (gated by browser permission). `src/pages/MyPreferences.jsx` renders a secondary toggle nested inside the Notifications card. New analytics event: `self_notify_toggled`.
- **0.13.0 — ErrorBoundary chunk-failure auto-recovery.** `src/components/ErrorBoundary.jsx` detects `ChunkLoadError`, the Safari MIME-type error, and the Vite/Webpack "Failed to fetch dynamically imported module" / "Loading chunk X failed" / "Importing a module script failed" messages. On match it unregisters any active service worker and force-reloads the page exactly once per session (sessionStorage marker guards against loops). Repeat crashes fall through to the existing manual UI. 4 new regression tests exercising each failure signature.
- **0.13.1 — self-notify permission fix + test button.** `handleToggleSelfNotify` in `src/pages/MyPreferences.jsx` now calls `requestPermission()` when the toggle is flipped ON and `getPermission() === 'default'` — mirroring the main `notificationsEnabled` toggle. A new `handleTestNotification` handler + "Send test notification" button calls `showNotification` with a fixed test payload whenever notifications are on and permission is granted. `testState` drives three UI states: idle / sending / sent / failed, with role=status and role=alert feedback lines. 8 new tests across the self-notify permission flow and the test-button lifecycle.
- **0.13.2 — iOS-safe notifications + viewport lock.** `src/lib/browserNotifications.js` grows two internal helpers, `showViaServiceWorker` (awaits `navigator.serviceWorker.ready` with a 2-second timeout then calls `registration.showNotification`) and `showViaConstructor` (existing page-level path). The public `showNotification` tries the SW path first and falls back to the constructor if the SW is absent, hung, rejects, or lacks the method. Reason: Apple's Web Push implementation on iOS 16.4+ PWAs requires the SW path — `new Notification()` from a page context silently does nothing, which is why the 0.13.1 test button was failing. No SW template changes required — `showNotification` is a built-in on the `ServiceWorkerRegistration` object. 8 new tests cover SW preference, constructor fallback, timeout fallback, iOS-scenario (constructor throws, SW delivers), and permission-denied no-op paths. `index.html` viewport meta now includes `maximum-scale=1.0, user-scalable=no`; `src/index.css` root gains `touch-action: manipulation`. A new `src/test/viewport.test.js` parses the built HTML + CSS and regression-guards the five locked attributes. 7 new tests.
- **No new dependencies.** Honours the CLAUDE.md "don't add deps without a reason" rule — everything uses `@supabase/supabase-js` (already installed) and browser-native APIs.
- **Plan** — `docs/plans/2026-04-19-001-feat-activity-push-notifications-beta-plan.md`.

---

## [0.11.0] — 16 Apr 2026 — My Preferences + Progress v2

### What's new

- **New "My Preferences" screen.** Tap the new hamburger menu in the top-right of any page and choose "My Preferences" to set your own water target, water tap increment, and sleep target. You don't have to live with the admin default any more — Barney can set his water goal to 2 L even though the admin default is 3 L. The daily check-in automatically uses your values, and the sleep chart draws its target band around your own number.
- **Header hamburger menu.** The three separate icons in the top-right (admin shield, theme toggle, sign out) have been consolidated into a single hamburger menu. Tap it to get My Preferences, Admin (if you're an admin), User Guide, Toggle theme, and Sign out in one list.
- **Progress page — redesigned with 13 new visualisations.** The Progress page now opens with a row of headline stat cards (total score, best day, best week, consistency %, longest streak) followed by a per-habit streaks strip with fire emojis, and progress bars toward your next bonus of each type. Then the existing score and cumulative charts — now with a ⭐ on your personal-best day and a dotted "at current pace" projection line to the challenge end date.
- **Sleep hours, mood / energy / stress / soreness, and hydration** each get their own chart in a new Wellness section — all driven by data the app was already collecting but wasn't showing.
- **A whole-challenge calendar heatmap**, a **six-axis radar chart** of your week-by-week balance (with a week selector), and a **Recovery × Strain scatter plot** colour-coded by week, all sit in a new Deep Dives section.
- **You vs Group Average** — a new line chart showing your delta to the rest of the leaderboard over time, with a small info tooltip explaining exactly what data is shared (the same public data that already shows on the leaderboard — nothing new). Positive = you're ahead, negative = there's ground to make up.
- **Patterns we're seeing** — the Progress page now surfaces correlations it finds in your data ("Days with higher sleep hours had higher nutrition score"). Only shows patterns that are statistically meaningful (|r| > 0.3 over at least 7 days). When there's not enough data yet, it shows a friendly "come back in a week" card instead of an empty void.

### Under the hood

- **`preferences jsonb` column on `profiles`** (migration `20260415000011_add_preferences_to_profiles.sql`, idempotent `DO $$ ... EXCEPTION` block, default `'{}'`). Non-destructive, zero downtime, no backfill. **Must be applied manually in Supabase Dashboard → SQL Editor after merge** — see the PR body for the exact paste-and-run steps.
- **`src/lib/adminConfig.js`** gains `PERSONALISABLE_KEYS` (the user-overridable whitelist — `hydrationTargetMl`, `hydrationIncrementMl`, `sleepTargetHours`), `sanitisePreferences(input)` (strips non-whitelisted keys, coerces to number, drops out-of-range values), and `getEffectiveConfig(profile)` (merges global + sanitised user prefs). Prevents users from overriding things like `challengeDays` or `exerciseTypes` by hand-crafting a preferences blob.
- **`src/pages/MyPreferences.jsx`** — form seeded from `profile.preferences` with fallback to the global admin config. Saves via `updateProfile(id, { preferences })` and then calls a new `updateLocalProfile` on the auth context for an optimistic UI update (also used by dev mode which has no DB). Only persists values that differ from the global default — no duplicate storage.
- **`src/components/HeaderMenu.jsx`** — portal-rendered dropdown with escape-to-close, backdrop click-to-close, and auto-close-on-item-click. 15 unit tests. Replaces the three individual header buttons in `Layout.jsx`.
- **`src/pages/CheckIn.jsx`** now calls `getEffectiveConfig(profile)` instead of `getConfig()`, so the hydration card's target reflects the user's own preference. The stored `target_ml` on `daily_entries.hydrate` is stamped with the effective target at save time so each daily record honestly reflects what the user was aiming for that day.
- **`src/lib/progressMetrics.js`** — a brand new pure-function library. `pearson(xs, ys)`, `calculateHabitStreaks`, `calculatePersonalBest`, `calculateConsistency`, `projectCumulative`, `calculateCorrelations`, `calculatePeerDelta`, `calculateRadarWeek`, `calculateHeatmapData`, `calculateStatCards`, `calculateWellnessTrends`. 42 unit tests covering happy / sad / edge cases for every function. No new dependencies — all stats hand-rolled.
- **Thirteen new Progress components** in `src/components/progress/` — `StatCards`, `StreaksStrip`, `BonusProgress`, `SleepHoursChart`, `WellnessSparklines`, `HydrationProgressChart`, `CalendarHeatmap` (hand-rolled SVG, ~80 lines), `RadarWeek` (Recharts `RadarChart` with week selector), `RecoveryStrainScatter`, `PeerDeltaChart`, `CorrelationInsights`, plus the existing daily score chart augmented with a `ReferenceDot` for the personal best and the cumulative chart augmented with a dashed projection line merged into one data array. 38 new component smoke-render tests covering empty states, insufficient-data branches, and full-render paths.
- **`src/pages/Progress.jsx`** reorganised into the section order agreed on the plan: stat cards → streaks strip → bonus progress → existing daily/cumulative (now with PB marker + projection) → Wellness → existing habit group → Deep Dives → existing habit heatmap + weekly totals → Insights (peer delta + correlations). Lazy-loaded as before; Recharts tree-shakes the new chart types into the same chunk.
- **`src/contexts/AuthContext.jsx`** exposes `updateLocalProfile(patch)` as a cheap in-memory optimistic updater. Used by My Preferences and available for any other surface that wants to write to the profile without waiting for a full round-trip.
- **Test suite growth** — 528 tests before this work, **653 tests after** (+125 tests across 10 new test files).
- **Bundle impact** — `Progress.js` chunk grew from ~382 kB → 463 kB gzipped 128 kB, reflecting the three new Recharts types (Radar / Scatter / additional Line overlays) and the ~12 new components. Well within reason given the surface area added.
- **Plan** — the full design / phase / acceptance-criteria doc is in `docs/plans/2026-04-15-001-feat-user-preferences-and-progress-v2-plan.md`.

---

## [0.10.5] — 15 Apr 2026 — Backfill the /changelog history

### What's new

- The /changelog page now tells the whole story of the app, not just the last couple of weeks. Scroll down past the recent entries and you'll see how the tracker grew from a single-user localStorage prototype on 11 April into the multi-user, leaderboard-backed, production-hardened thing it is now — split into eight coarse phases from `v0.1.0` through `v0.8.0`, each with its own "What's new" and "Under the hood" sections.

### Under the hood

- `CHANGELOG.md` gained eight retroactive entries reconstructed from git history (commits `655dddd` through `c24881d`). Version numbers are synthetic — the project only started tracking semver at `0.9.5` — but the dates and commit SHAs are real, and each entry references the commits it was built from so the mapping back to the git log stays honest.
- The "pre-existing production hardening baseline" one-liner in the `[0.9.5 → 0.9.6]` entry was trimmed to a pointer at the new `[0.5.0]`, `[0.7.0]`, and `[0.8.0]` entries so the same work isn't documented twice.
- No code change — but `CHANGELOG.md` is bundled into the JS via Vite's `?raw` import (see `src/lib/changelogContent.js`), so this ships as a real production deploy and earns a patch bump.

---

## [0.10.4] — 14 Apr 2026 — Stop the iOS PWA rubber-band

### What's new

- On iPhone, opening the app from the home-screen icon no longer lets you drag the whole app around inside the window. The page sits still where it should, the way a native app does.

### Under the hood

- `html, body { overscroll-behavior: none; }` added to `src/index.css`. That's the entire fix — iOS Safari 16+ (standalone PWA mode included) respects the standard `overscroll-behavior` property and disables rubber-band at the root scroller when it's set to `none`. No layout restructuring, no new scroll container, no `position: fixed` body trickery — which keeps keyboard-focus-scroll and document-level scroll working exactly as they did before.
- The more invasive "lock body and make `#root` the scroller" pattern was considered and rejected: it would change scroll container semantics (with knock-on effects for input focus behaviour on mobile keyboards, back-button scroll restoration, etc.) for no additional benefit in the common case. If a future device surfaces a case the minimal fix doesn't cover, the escalation path is documented in the `src/index.css` comment.

---

## [0.10.0 → 0.10.3] — 13 Apr 2026 — Changelog page + PWA update flow

### What's new

- Tap the version number in the footer of any page to see the release history on a new `/changelog` page. An **X** in the top-right closes it and returns you to whatever page you came from.
- New version deploys now automatically show a **"New version available — Refresh"** toast at the bottom of any open session. Tap Refresh to get the latest build — no more manual home-screen-icon dances.
- Each changelog entry is split into customer-facing outcomes (full contrast) and technical detail (dimmer) so it's easy to scan for what actually changed for you.

### Under the hood

- **`/changelog` page** — new route in `src/pages/Changelog.jsx`, lazy-loaded via Suspense. Renders markdown blocks parsed from the repo's `CHANGELOG.md` file, imported via Vite's `?raw` loader through `src/lib/changelogContent.js`. Hand-rolled markdown parser in `src/lib/parseChangelog.js` handles the keep-a-changelog subset (h1/h2/h3/bullet lists/hr). Zero new dependencies — `react-markdown` / `marked` would have added 30–50KB for features we don't need. The page's X button uses `useNavigate(-1)` so it returns to the previous route.
- **Footer is now a link** — the version string at the bottom of every page is a `<Link to="/changelog">` with `aria-label="View changelog"`. Visual appearance unchanged.
- **Customer-vs-technical rendering** — new `src/lib/annotateChangelogBlocks.js` walks the parsed blocks and tags each with a `dim: boolean` based on which h3 section it sits inside. h2/hr reset to non-dim; h3 matching `/under the hood|dev notes|technical/i` flips to dim. The page renders dim h3 in `colors.textFaint` and dim bullet lists in `colors.textDim` — same font size, lower contrast, still readable.
- **Service worker update detection** — the original SW from `[0.9.5 → 0.9.6]` was byte-identical between deploys, so the browser never fired `updatefound` and the UpdateToast never showed. Moved `public/sw.js` → `src/sw.template.js` with a `__WLC_BUILD_ID__` placeholder. A new inline Vite plugin (`wlcServiceWorkerPlugin` in `vite.config.js`) substitutes the placeholder with the git SHA at build time and emits the result as `dist/sw.js`. Each deploy now produces a unique `sw.js` (byte-wise) which is what the browser uses to detect SW updates.
- **`CACHE_NAME` now includes the build SHA** (`wlc-cache-<sha>`) so old caches from previous builds are purged automatically in the SW's `activate` handler.
- **`event.waitUntil` on the background fetch** — the original stale-while-revalidate implementation was fire-and-forget; the browser could abort the background refresh before the cache update landed. Fixed so the SW stays alive until the fetch + `cache.put` complete.
- **Forced update checks** — the browser is lazy about checking for new SWs on its own (iOS Safari especially). `registerServiceWorker` now explicitly calls `registration.update()` at three points: immediately after registering, on `visibilitychange → visible` (user returns to the tab), and on a 60-second interval while the app is loaded. This is the standard PWA update-detection pattern and it's what actually triggers the UpdateToast in practice. `UPDATE_CHECK_INTERVAL_MS` constant is exported for tests.
- **Helpers with full test coverage** — `src/lib/parseChangelog.js` (12 tests), `src/lib/annotateChangelogBlocks.js` (14 tests), `src/lib/substituteBuildId.js` (8 tests), `src/lib/serviceWorker.js` update-check tests (6 new).

---

## [0.9.5 → 0.9.6] — 13 Apr 2026 — First tracked release

First version that was actually embedded in the app, displayed in the footer, and tagged as a release. Reflects "almost at a stable 1.0" — the production-hardening work in the entries below had all landed, and what remained was the optional GDPR / privacy / cookie items (only relevant if the app opens beyond its current 4-user whitelist).

### What's new

- Version number visible at the bottom of every page as `vX.Y.Z (sha7)` so you can see exactly which deploy you're on.
- `/health` endpoint shows the same version + build timestamp plus an OK / DOWN status for Supabase connectivity.
- First installable PWA — home-screen icon works on iOS and Android, runs standalone, offline-capable after first visit.
- Home screen icon cleaned up — removed the stale "42" left over from when this was a 42-day challenge.
- iOS PWA header buttons (theme toggle, sign out) no longer hidden behind the iOS status bar when running as a home-screen app. Theme toggle reachable again.

### Under the hood

- `package.json` bumped `0.0.0` → `0.9.5`; version injected at build time via `vite.config.js` `define` alongside the git SHA (`__APP_VERSION__`, `__APP_SEMVER__`, `__BUILD_TIME__`).
- `src/lib/version.js` exposes `getVersion`, `getShortVersion`, `getSemver`, `getBuildTime`, `getDisplayVersion` — all reading from build-time globals.
- `env(safe-area-inset-*)` padding added to `.wlc-container` on all four sides (both mobile and desktop media queries) so iOS Dynamic Island / notch / home-indicator regions don't overlap app content. Root cause: `index.html` sets `apple-mobile-web-app-status-bar-style="black-translucent"` + `viewport-fit=cover`, which tells iOS the app draws under the status bar — and the app is expected to add the inset padding itself.
- First service worker shipped (`public/sw.js`) with stale-while-revalidate for HTML/JS/CSS/fonts/icons and bypass for Supabase/PostHog/Sentry. Update detection was broken in this initial version — fully fixed in the `[0.10.0 → 0.10.3]` range above.
- All the production-hardening baseline work (error tracking, backups, RLS, CI, a11y, health, save queue, analytics, …) was already live when this release shipped — see the `[0.5.0]`, `[0.7.0]`, and `[0.8.0]` entries below for the breakdown.

---

## [0.8.0] — 13 Apr 2026 — Reliability and insight

### What's new

- A small save indicator in the corner tells you whether your latest change has synced to the cloud, is still pending, or failed. If you lose signal mid-edit, your changes queue up and flush automatically when you're back online.
- The login screen now shows a friendly notice when your session has expired, instead of silently bouncing you back to sign-in with no explanation.
- Basic product analytics so we can see which features actually get used — without any of your personal detail ever leaving the app.

### Under the hood

- Session-expiry banner on the login screen (`329f6d0`, Phase 3 #18) reading `?session=expired` query param from the redirector.
- Retry queue + `SaveStatusIndicator` (`2561443`, Phase 3 #19) — each daily-entry save goes through an optimistic write, a localStorage backup, and a retry queue that drains on reconnect. Status indicator in the header reflects the queue state.
- CHECK constraints on `daily_entries` in a new Supabase migration + a matching client-side validator (`2b5cf3b`, Phase 3 #17) so bad values (negative durations, out-of-range scores) can't land in the database from either side.
- PostHog product analytics wired through `src/lib/analytics.js` — a thin PII-stripping wrapper that drops `email`, `name`, `*_text`, `display_name`, and anything free-text before the event hits the network. `autocapture: false`, `disable_session_recording: true`. User identified by Supabase UUID only (`a7a061b`, Phase 2 #10).

---

## [0.7.0] — 13 Apr 2026 — Production hardening, part 2

### What's new

- Every code change now runs through automated checks (lint, tests, build) before it's allowed to merge, so broken builds can't reach production.
- Text contrast pass across both light and dark themes so everything meets accessibility guidelines.
- A proper 404 page when you hit a URL that doesn't exist, instead of a blank screen.
- A `/health` page that tells you whether the app can reach its backend at a glance.

### Under the hood

- GitHub Actions CI workflow (`466a939`, Phase 2 #9) running `npm ci`, lint, `vitest run`, and `vite build` on every push and PR. Branch protection on master requires the `Lint · Test · Build` check to be green before merge.
- WCAG AA contrast audit + fixes across both themes (`b433d84`) — Lighthouse-style pass covering text on all surface colours, button states, and disabled controls.
- 404 NotFound page on unknown routes (`22ad5ab`, Phase 2 #20).
- `/health` endpoint (`64cff50`, Phase 2 #21) rendering version, build timestamp, and an OK / DOWN status pinged from Supabase.

---

## [0.6.0] — 13 Apr 2026 — Auth deadlock fix and the Help system

### What's new

- Tap any "?" icon to pop up a bottom-sheet explaining what a given metric means and how it's calculated. No more guessing what a number is asking for.
- The 1–5 self-report scales now say plainly what each number means, instead of just showing a bare slider.
- A sneaky login deadlock that could leave you stuck on "signing in…" forever is fixed.
- The challenge start date is correct again after a stray copy-paste moved it.

### Under the hood

- `f7e2222` — two fixes bundled. (1) Broke a re-entrancy deadlock in supabase-js's `navigator.locks`-based auth lock that could wedge `getSession()` forever on some browser/tab-switching patterns. (2) Gated the `handle_new_user` Supabase trigger on the `allowed_emails` whitelist so the whitelist is enforced at the database layer as well as at the app layer.
- `<Help>` bottom-sheet component + content (`6fb88aa`) and the 1–5 scale clarifications (`e9aa490`).
- Challenge start date correction + Help component polish (`ce04d9f`).
- `b4550cc` — the Help dialogue now portals to `document.body` so it doesn't inherit uppercase text transforms from its parent container (the button group that triggers it).

---

## [0.5.0] — 12 Apr 2026 — Production hardening, part 1

### What's new

- When something goes wrong, you'll see a friendly "something went wrong" screen with a reload option, instead of a blank page — and the error gets reported privately so it can be fixed.
- Your data is backed up automatically every day. If the database ever has a bad day, nothing is lost.
- A security pass on who can see what in the database so nobody can read another player's data by poking at the API directly.

### Under the hood

- React `ErrorBoundary` wrapping the app and each route (`d36471f`) with two layers — a top-level fallback and per-route fallbacks — so a broken page doesn't take the whole app down.
- Sentry wired into both the error boundary and the auth flow (`a07c3d1`) with `sendDefaultPii: false` and user identified by Supabase UUID. Later refined with an `ignoreErrors` filter (`8ad515b`) to drop known-benign browser noise so the free-tier quota isn't burned on junk.
- Daily Supabase backup as a GitHub Actions workflow (`2b88880`) — scheduled job, artefacts uploaded to the workflow run, tested end-to-end with a temporary push trigger that was then removed (`ac5e77f` → `c8e6ad5`).
- Row-Level Security audit + fixes (`b4b8128`) — RLS policies tightened so `daily_entries`, `profiles`, and related tables can only be read/written by their owner.
- Profile-delete cascade trigger (`5591db3`) so removing a profile cleans up every table that references it, instead of leaving orphans.

---

## [0.4.0] — 12 Apr 2026 — Onboarding, docs, and first-run polish

### What's new

- A proper onboarding flow for new players — guided setup for your first entry instead of being dropped straight into an empty tracker.
- A full user guide accessible from a new info icon in the header, plus a project homepage linked from the app title.
- Info icons with plain-English explanations on each bonus tracker card so you know what each metric is actually asking for.
- "Board" renamed to "Leader Board" to match how people actually talked about it.
- Fixed a handful of "stuck on loading" screens that could wedge you if the backend was slow or unreachable.
- On mobile, the "How do you feel?" section now stacks vertically instead of cramming everything into one row.
- Spreadsheet links for the three WLC levels (Kickstart / Lifestyle / Performance) so players can check the official rules.

### Under the hood

- Commits `cb488b5` (onboarding flow) through `5873910` (docs links to `wholelifechallenge.parnellsystems.com`).
- Two important resilience fixes: `b301c8a` added a 6-second timeout safety net to `AuthContext.getSession` so a hanging Supabase call can't wedge the login flow forever, and `23a6aaf` + `8baecb3` added fallback paths so a failed data fetch renders an error state instead of spinning indefinitely.
- `9adbbaf` fixed `clearAll` so it actually deletes the server-side data via Supabase rather than just clearing localStorage, and hid the sample-data seed in production builds.
- Header info icon (`4aec7e7`), bonus tracker info icons (`e6e7257`), mobile layout fix (`058a869`), nav rename + Reset removal (`d7809d9`), level spreadsheet links (`b9a7414`).

---

## [0.3.0] — 12 Apr 2026 — Multi-user, leaderboard, and admin

### What's new

- The tracker becomes a group challenge. Invite other players, see who's doing what on a live leaderboard that updates in real-time as entries land.
- Overlay your progress against another player's to compare week-by-week.
- New admin screen for managing the group — who's in, who's out, and day-to-day bonus auto-apply rules.

### Under the hood

- `5176c45` — Phase 4 drop: multi-user auth, admin surfaces, leaderboard, and bonus auto-apply rules.
- `77807e8` — Phase 4 Tier 3: realtime leaderboard via Supabase Realtime subscriptions + a comparison overlay that lets you stack one player's curve on top of another's.

---

## [0.2.0] — 12 Apr 2026 — Cloud sync, themes, and the full v3 metric set

### What's new

- Sign in with your account and your data follows you between devices — no more living inside a single browser.
- Light and dark theme toggle.
- Exercise duration tracking, bonus metrics, recovery metrics, and AI-written reflections on how your week has gone.

### Under the hood

- Rolled up from two big drops: `90b9bab` (v2+v3 Phase 1 — Supabase auth, theme system, UX polish) and `b397db1` (v3 Phase 2+3 — exercise duration, bonuses, recovery metrics, AI reflections).
- Everything moved from localStorage-only to Supabase-backed with localStorage as a fallback cache — the groundwork that made every later feature (leaderboard, retry queue, multi-device) possible.

---

## [0.1.0] — 11 Apr 2026 — Initial build

### What's new

- First version of the tracker. Daily check-in form covering the core Whole Life Challenge metrics, a progress view, and a local-only single-user experience.

### Under the hood

- Vite + React + Tailwind scaffold. No backend yet — state persisted to localStorage. Initial commit: `655dddd`.
