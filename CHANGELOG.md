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
