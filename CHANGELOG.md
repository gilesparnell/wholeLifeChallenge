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
