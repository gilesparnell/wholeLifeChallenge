---
title: "feat(0.14.0): iOS push fix, viewport lock, multi-activity exercise"
type: feat
status: active
date: 2026-04-19
---

# feat(0.14.0): iOS push fix, viewport lock, multi-activity exercise

## Overview

Three related fixes / features shipped together as **v0.14.0**. Two are short fixes the user is currently blocked on; the third is a new feature they asked for. Bundled because the iOS-notification fix touches the same module the multi-activity work broadcasts through, and because all three land on the same surface (Check In / Preferences) which means one round of manual QA covers the lot.

1. **Fix — iOS PWA notifications now actually fire.** The 0.13.1 "Send test notification" button triggers `new Notification(...)`, and on iOS PWAs that constructor does not reliably display anything — Apple's Web Push implementation requires `ServiceWorkerRegistration.showNotification()` even for client-initiated (non-push) notifications. Route the existing wrapper through the SW path when a service worker is registered.
2. **Fix — viewport lock in the installed PWA.** The user can pinch-zoom the app and drag-scroll the chrome around. Tighten the viewport meta + add CSS locks so the app behaves like a native shell inside the standalone PWA.
3. **Feature — multi-activity exercise logging.** Let the user log multiple exercises per day (e.g. swim 30 min + run 20 min + gym 45 min). Each entry carries its own type + duration. The Exercise card surfaces the list + total minutes; the progress page's minute sums honour all entries.

Target version: **0.14.0** (minor — new user-visible feature + data-shape change).

## Problem Frame

0.12.0 shipped the activity-notification feature and 0.13.x shipped two rounds of fixes (default opt-out → opt-in, chunk-error recovery, self-notify permission prompt, test button). The user is on 0.13.1, has granted browser permission, and **still sees no notification** after completing an activity. The most likely remaining cause is the iOS PWA Notification API constructor failing silently — this class of failure is documented in MDN/Apple developer docs and matches the symptom exactly.

Separately, the user also surfaced two unrelated annoyances while testing: pinch-zoom + chrome-scroll in the installed PWA (UX regression), and the desire to log more than one exercise per day (feature request — current model is one-type-per-day which loses data for people who do multiple sessions).

## Requirements Trace

- **R1.** Clicking "Send test notification" on `/preferences` on an iOS 16.4+ installed PWA produces a visible notification.
- **R2.** Completing an activity (exercise, wellbeing, reflexion, hydration target) on today's entry produces a visible notification on iOS PWAs for every whitelisted user with `notifyOnOwnActivity` on (the requestor) and every other whitelisted user who has notifications enabled (the peer circle).
- **R3.** Desktop + Android behaviour is unchanged.
- **R4.** The installed PWA cannot be pinch-zoomed, and the app chrome cannot be accidentally dragged off-screen.
- **R5.** Page-level scrolling (Check In list, Progress charts) still works exactly as before — only the outer viewport is locked.
- **R6.** A user can log multiple exercise entries on the same day. Each entry has a type + an optional duration.
- **R7.** The Exercise card shows all logged entries with a way to remove any one, plus a total "minutes today" summary.
- **R8.** The same treatment applies to Mobilise (same card type, same use case).
- **R9.** Data created before 0.14.0 (single-type rows) must still render correctly — no data loss, no broken UI, no destructive migration required.
- **R10.** Scoring is unchanged — exercise still counts as 1 × 5 points when at least one entry is logged.
- **R11.** The activity-completion broadcast fires exactly once per day per activity type (first transition only), not once per entry added.

## Scope Boundaries

- **Out of scope:** true background Web Push (deferred again — this plan only fixes the existing foreground path on iOS).
- **Out of scope:** per-entry notifications ("Someone special has just completed swimming AND running AND gym"). One notification per day per habit transition is enough — stacking is noise.
- **Out of scope:** scoring changes (duration-weighted scoring, minutes targets, etc.) — the habit is still binary, duration is metadata.
- **Out of scope:** bulk-delete / reorder of entries in the Exercise card — a simple inline remove per row is the MVP.
- **Out of scope:** mobile keyboard interaction fixes if the viewport lock interferes with the custom-duration input — mitigate with `interactive-widget` meta if needed, otherwise follow-up.
- **Out of scope:** backfill / data migration of existing rows — the readers adapt to the old shape at read time.

## Context & Research

### Relevant Code and Patterns

- **`src/lib/browserNotifications.js`** — current wrapper that uses `new globalThis.Notification(title, opts)`. This is the module to fix for R1 / R2.
- **`src/sw.template.js`** — hand-rolled service worker built into `public/sw.js` at build time by the Vite plugin. Already `skipWaiting` + `clients.claim`. No `push` event handler yet (and does not need one — this plan stays foreground-only).
- **`src/lib/serviceWorker.js`** — registers the SW. Returns the registration. The browser-notifications wrapper can read `navigator.serviceWorker.ready` at show time.
- **`index.html`** — currently `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`. Missing `maximum-scale=1, user-scalable=no`. Also `apple-mobile-web-app-capable=yes` is present, so the standalone PWA context is already declared.
- **`src/index.css`** — the global stylesheet, where the body-level `overscroll-behavior` + `touch-action` locks land. The v0.10.4 rubber-band fix already touched this file and is a reference for the iOS-only guards.
- **`src/lib/habits.js`** — `emptyDay()` defines the `exercise` + `mobilize` shape. Today: `{ completed, type, duration_minutes }`. New: `{ completed, entries: [{ type, duration_minutes }] }` with the legacy fields still accepted on read.
- **`src/components/habits/ExerciseCard.jsx`** — single-type dropdown + duration picker. Becomes a list + "+ Add another" affordance.
- **`src/lib/scoring.js`** — `isHabitCompleted(value)` already handles `typeof value === 'object' && !!value.completed`. The `completed` flag is the source of truth and does not need duration logic.
- **`src/lib/progressMetrics.js`** — `exerciseMinutes: (day) => day?.exercise?.duration_minutes ?? null` at line 160. Becomes sum of entry durations; returns null when no entries.
- **`src/lib/dayDataValidator.js`** — validates dayData for the save path. Needs a new rule for `entries[].duration_minutes` (same numeric bounds as today: 1–480 minutes).
- **`src/contexts/DataContext.jsx`** — `detectActivityFlips` based on `completed: false → true` is already what we want for R11. No broadcast-semantics change needed — the `completed` boolean flips once per day when the first entry lands, and adding a second entry keeps `completed: true` so the flip detector stays silent. Good.
- **`supabase/migrations/20260413000010_daily_entries_check_constraints.sql`** — existing CHECK constraints on `daily_entries`. The `exercise` column is JSONB; no schema change needed for the array form. The only DB-level constraint today is on `nutrition`, `sleep->>'hours'`, `hydrate->>'current_ml'`, `hydrate->>'target_ml'`. No exercise-shape constraint exists, so the reshape is DB-safe.

### Institutional Learnings

- **iOS PWA Notification API is half-broken.** On iOS Safari (any build), `new Notification()` from a regular page throws a `TypeError`. On iOS 16.4+ installed PWAs, `Notification.requestPermission()` works and `Notification.permission === 'granted'` reports correctly, but `new Notification()` silently fails to display (it may construct the object, never show the UI). The officially supported path is `navigator.serviceWorker.ready → registration.showNotification(title, opts)`. This path works identically on desktop Chrome / Safari / Firefox, so switching to it is a net simplification — we don't need platform-specific branching, just "prefer SW when available, fall back to constructor when not".
- **Hand-roll before depending.** Our `public/sw.js` is already hand-rolled and minimal (70 lines). Adding `registration.showNotification()` support requires no SW-side code at all — `showNotification` is a built-in method on every `ServiceWorkerRegistration`. No push handler, no VAPID, no Edge Function. This is compatible with the CLAUDE.md "don't add deps without a reason" rule.
- **Viewport locking on iOS needs three things.** (1) `maximum-scale=1, user-scalable=no` in the viewport meta; (2) `touch-action: manipulation` on the root element so iOS stops eating taps for double-tap-to-zoom; (3) `overscroll-behavior: none` on `html, body` (already partially addressed in v0.10.4 for rubber-band specifically — extend). iOS Safari historically ignored `user-scalable=no` in regular browsing, but honours it in `standalone` PWA mode, which is exactly our deploy target.
- **Backward-compatible data shapes save backfill pain.** The 0.11.0 `preferences` JSONB column shipped with a `'{}'::jsonb` default and readers that tolerate missing keys — no backfill needed, no downtime. Apply the same pattern to the `exercise.entries` array: missing entries + legacy `type`/`duration_minutes` fields map to a single-entry array on read; writers always emit the new shape.

### External References

- **MDN: `ServiceWorkerRegistration.showNotification()`** — the canonical cross-browser API. Supports title + `body`, `tag`, `icon`, `data`, `actions`, etc. Works from the page context (doesn't need a `push` event).
- **MDN: `Notification` constructor** — "On mobile platforms, … most browsers only allow notifications to be created from the `ServiceWorkerRegistration.showNotification()` method."
- **Apple developer notes (iOS 16.4)** — Web Push and the Notifications API landed together for installed PWAs. Apple specifically documents the SW-registration path as the way to show notifications.
- **web.dev: "PWA viewport in standalone mode"** — `maximum-scale=1, user-scalable=no` is the accepted way to lock pinch-zoom in installed PWAs.

## Key Technical Decisions

- **Always route through the SW when available.** No platform sniffing. Feature-detect `navigator.serviceWorker?.controller || (await navigator.serviceWorker.ready)`. Fall back to `new Notification()` when no SW is present (dev without a build, unsupported browsers). This is simpler than branching on `platform === 'ios'` and it fixes desktop Safari / older Android too.
- **Keep the existing `browserNotifications.js` public API.** `showNotification({ title, body, tag, icon })` stays the same shape. Only the innards change. All callers (ActivityNotifier, DataContext self-notify echo, MyPreferences test button) are unchanged.
- **SW template does NOT change.** `showNotification` on the registration object is a page-side method — the SW doesn't need to know about it. Future background Web Push will need a `push` event handler; that's a separate plan.
- **Viewport + CSS changes are additive.** The existing `viewport-fit=cover` stays. Add `maximum-scale=1, user-scalable=no`. Extend the existing `overscroll-behavior: none` cover to include `html` as well as `body`, and add `touch-action: manipulation` on `html`. Leave scrollable containers (Progress page charts, Journal list) untouched — they scroll via their own overflow rules.
- **Multi-activity shape: array of entries, legacy fields tolerated on read.** 
  ```
  exercise: {
    completed: true,        // true iff entries.length > 0 (writer invariant)
    entries: [
      { type: 'Running', duration_minutes: 30 },
      { type: 'Swimming', duration_minutes: 15 },
    ],
  }
  ```
  Reader helpers `getExerciseEntries(exercise)` and `getTotalExerciseMinutes(exercise)` in `src/lib/habits.js` (new — pure helpers). They fall back to `[{ type, duration_minutes }]` when `entries` is missing but `type` is present (pre-0.14 data).
- **Legacy fields are NOT written.** After 0.14.0, new saves only emit `{ completed, entries }`. Old rows that still have `{ completed, type, duration_minutes }` are readable forever but never rewritten until the user touches that day again. A future cleanup migration (not in this plan) can backfill.
- **Broadcast behaviour (R11).** Unchanged. The flip detector looks at `exercise.completed: false → true`. First entry added flips `completed` to true → broadcast fires. Subsequent adds keep `completed: true` → no broadcast. Removing all entries flips back to false; the next first-entry add re-fires.
- **UI model for adding entries.** The card shows:
  - Each existing entry as a row: `Running · 30 min · ×` (tap × to remove).
  - A "+ Add another" button below the list.
  - Tapping "+ Add another" reveals the existing type picker → duration picker flow, which on confirm pushes to `entries[]`.
  - Summary line above the list: `Total: 1h 15m · 3 activities` (hidden when empty).
- **Same treatment for Mobilise.** Symmetric — R8. Same card, same helper, same tests; just different `habits.id`.
- **Version bump + changelog behaviour.** 0.14.0 (minor — user-visible feature). Start a NEW CHANGELOG heading (not a range extension on `[0.12.0 → 0.13.1]`) because multi-activity is a genuinely new user feature, not polish on the previous burst. The two fixes piggy-back under the same heading.

## Open Questions

### Resolved During Planning

- **Why is self-notify still not firing?** Almost certainly `new Notification()` constructor not working on the user's iOS PWA. The fix is the SW-registration path. Validated by: (a) spec-level limitation documented on MDN; (b) Apple's own PWA notification docs only show the SW path; (c) the test notification also isn't appearing for the user, which points at the API layer, not the flip detection. If after deploying Unit 1 the test button still fails, the next fallback is to `navigator.serviceWorker.controller.postMessage(...)` + an SW-side receiver; defer.
- **Per-entry vs per-day broadcasts.** One per day per activity transition — matches the existing contract and avoids spamming the four-user circle.
- **Schema change needed for multi-activity?** No. `daily_entries.exercise` is JSONB; the change is purely shape-of-payload, and the existing CHECK constraints don't touch `exercise`.
- **Reorder / edit entries?** Out of scope for MVP.
- **Duration required for every entry?** No — same as today. Type is required (otherwise there is no entry to show); duration is optional.
- **What if the user's device is on iOS < 16.4?** The SW `showNotification` path requires iOS 16.4 (same as the constructor). Both fail identically on older iOS. The wrapper returns `false` from `showNotification({...})` in that case; users see the "Couldn't send" hint from the test button. Acceptable.

### Deferred to Implementation

- **Exact animation / micro-interaction for removing an entry.** Probably a fade-out; implementer's call.
- **Whether to collapse the type picker back after an entry is added.** Probably yes — default "idle" state shows just the summary + "+ Add another".
- **Whether the custom-duration number input triggers a viewport zoom on focus.** If it does, Unit 2's `maximum-scale=1` should still prevent it; if not, follow-up.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

### iOS notification routing

```
showNotification({title, body, tag, icon})
  │
  ├── isNotificationSupported() === false  → return false
  ├── getPermission() !== 'granted'        → return false
  │
  ├── navigator.serviceWorker available?
  │     YES  → await navigator.serviceWorker.ready
  │           → registration.showNotification(title, {body, tag, icon, silent:false})
  │           → return true
  │     NO   → try { new Notification(title, {...}) → return true }
  │             catch → return false
  │
  └── any unexpected throw                 → return false (swallowed)
```

### Multi-activity data shape

```
// ON DISK (daily_entries.exercise jsonb — after 0.14.0 save)
{
  "completed": true,
  "entries": [
    { "type": "Running",  "duration_minutes": 30 },
    { "type": "Swimming", "duration_minutes": 15 }
  ]
}

// ON DISK (legacy pre-0.14.0 row — still readable forever)
{
  "completed": true,
  "type": "Running",
  "duration_minutes": 30
}

// getExerciseEntries(ex) — always returns []-or-more
// getTotalExerciseMinutes(ex) — always returns a number
```

### ExerciseCard state diagram

```
┌────────────────────────────────────────────────┐
│  EMPTY (no entries)                            │
│   → shows habit icon + desc                    │
│   → tap card → PICKING                         │
└────────────────────────────────────────────────┘
               │ add first entry
               ▼
┌────────────────────────────────────────────────┐
│  FILLED (entries.length >= 1)                  │
│   → summary line: Total 1h 15m · 3 activities  │
│   → list of rows: Type · Min · ×               │
│   → "+ Add another" button → PICKING           │
│   → tap × on last row → EMPTY                  │
└────────────────────────────────────────────────┘
               │ "+ Add another"
               ▼
┌────────────────────────────────────────────────┐
│  PICKING                                        │
│   → existing type chips → duration chips       │
│   → confirm → push entry → FILLED              │
│   → cancel → FILLED (or EMPTY if no entries)   │
└────────────────────────────────────────────────┘
```

## Implementation Units

- [ ] **Unit 1: Fix — iOS-safe notifications via ServiceWorkerRegistration.showNotification**

**Goal:** Route `showNotification()` through `navigator.serviceWorker.ready → registration.showNotification()` when available, fall back to `new Notification()` otherwise. Zero change to the module's public API.

**Requirements:** R1, R2, R3.

**Dependencies:** none.

**Files:**
- Modify: `src/lib/browserNotifications.js`
- Modify: `src/lib/browserNotifications.test.js`

**Approach:**
- Add an internal `showViaServiceWorker({ title, body, tag, icon })` helper that `await`s `navigator.serviceWorker.ready` (with a short timeout — say 2 s — after which we fall back, so a broken SW doesn't hang the caller forever), then calls `registration.showNotification(title, { body, tag, icon, silent: false })`.
- Add an internal `showViaConstructor(...)` that is the existing code path, returned as a boolean promise.
- `showNotification(...)` becomes: permission check → if `navigator.serviceWorker && 'ready' in navigator.serviceWorker` → try `showViaServiceWorker`; on failure OR if SW is absent → try `showViaConstructor`. Always returns a boolean promise. Never throws.
- Keep `isNotificationSupported()` / `getPermission()` / `requestPermission()` unchanged.

**Execution note:** Execution target: codex-delegate. Mechanical once the contract is locked.

**Patterns to follow:**
- `src/lib/serviceWorker.js` — `navigator.serviceWorker.*` feature detection pattern.
- The existing wrapper's pattern of swallowing all browser-layer throws.

**Test scenarios:**
- SW unavailable, permission granted, constructor works → returns true via constructor (existing behaviour preserved).
- SW available + ready, permission granted → uses `registration.showNotification`, constructor is NOT called.
- SW available, permission granted, `registration.showNotification` rejects → falls back to constructor, eventually returns true or false per constructor outcome.
- SW available but `navigator.serviceWorker.ready` hangs >2 s → timeout fires, falls back to constructor.
- Permission denied → no-op, returns false, neither path invoked.
- Constructor throws `TypeError: Illegal constructor` (iOS-page case) and no SW → returns false without throwing.
- Passes `{ tag, icon, body }` through to `registration.showNotification` options.

**Verification:**
- `npx vitest run src/lib/browserNotifications.test.js` passes.
- Manual smoke on iOS PWA (installed to home screen, iOS 16.4+): the 0.13.1 "Send test notification" button on `/preferences` now shows a real OS notification.

---

- [ ] **Unit 2: Fix — viewport lock in installed PWA**

**Goal:** Prevent pinch-zoom and chrome-level scrolling in the installed PWA. Interior scrollable regions (Progress page, Journal) still scroll.

**Requirements:** R4, R5.

**Dependencies:** none.

**Files:**
- Modify: `index.html` (viewport meta)
- Modify: `src/index.css` (root-level touch-action + overscroll-behaviour)
- Create: `src/__tests__/viewport.test.js` (or colocate) — a node-side test that parses the built HTML and checks the meta tag attributes
- Modify: `src/components/Layout.test.jsx` — optional, smoke-check that root styles include `touch-action`

**Approach:**
- Viewport meta: `content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"`. Keep `viewport-fit=cover` for notch handling.
- `src/index.css` root rule: `html { touch-action: manipulation; overscroll-behavior: none; }` — complements the existing v0.10.4 rubber-band fix without regressing it.
- Smoke test: read `index.html`, assert the `viewport` meta string contains `maximum-scale=1.0` and `user-scalable=no`.

**Execution note:** Execution target: codex-delegate.

**Patterns to follow:**
- v0.10.4 PWA rubber-band fix in `src/index.css` — same file, same mechanism.

**Test scenarios:**
- Viewport meta in `index.html` contains `maximum-scale=1.0` and `user-scalable=no`.
- `src/index.css` contains `touch-action: manipulation` on the root.
- Existing rubber-band lock still present (regression guard).

**Verification:**
- Unit + CSS-string assertions green.
- Manual smoke on the installed PWA: pinch to zoom → nothing happens. Drag the top of the page → the app chrome does NOT move.
- Manual smoke: Progress page + Journal page still scroll internally.

---

- [ ] **Unit 3: Multi-activity — data shape + pure helpers (backward compatible)**

**Goal:** Introduce the `entries: [{type, duration_minutes}]` shape on `exercise` and `mobilize`. Add pure helpers that always return the normalised shape regardless of whether the row is old or new.

**Requirements:** R6, R7, R8, R9.

**Dependencies:** none.

**Files:**
- Modify: `src/lib/habits.js`
- Create: `src/lib/habits.test.js` (if not already present — check first)
- Modify: `src/lib/scoring.js` (verify `isHabitCompleted` still matches; likely no change)
- Modify: `src/lib/progressMetrics.js` (replace `day?.exercise?.duration_minutes ?? null` with a sum over entries via the new helper)
- Modify: `src/lib/progressMetrics.test.js` (existing tests — update fixtures and add new cases)
- Modify: `src/lib/dayDataValidator.js` (+ `.test.js`) — validate `entries` is an array of `{type:string, duration_minutes:number|null}` within range

**Approach:**
- `emptyDay()` in `habits.js`:
  - `exercise: { completed: false, entries: [] }`
  - `mobilize: { completed: false, entries: [] }`
- New exports in `habits.js`:
  - `getExerciseEntries(exercise)` → `Array<{type, duration_minutes}>` — normalises old shape.
  - `getTotalExerciseMinutes(exercise)` → `number` — sum of `duration_minutes`, treating null as 0.
  - Symmetric pair for mobilise (or a single generic `getHabitEntries(slot)` — implementer's call).
- Readers that need duration (progressMetrics.exerciseMinutes, the Progress duration chart, any stats helpers) go through `getTotalExerciseMinutes(...)`.
- `isHabitCompleted(value)` already checks `!!value.completed` — unchanged; `completed` stays the writer invariant.

**Execution note:** Execution target: codex-delegate, test-first.

**Patterns to follow:**
- `src/lib/adminConfig.js` — pure-helpers with pass-through + sanitisation shape.
- 0.11.0 `sanitisePreferences` — tolerate garbage, never throw.

**Test scenarios:**
- `getExerciseEntries({completed:true, entries:[{type:'Running',duration_minutes:30}]})` → `[{type:'Running',duration_minutes:30}]`.
- Legacy `{completed:true, type:'Running', duration_minutes:30}` → returns `[{type:'Running', duration_minutes:30}]`.
- Legacy with no type + no duration → returns `[]`.
- Empty new shape `{completed:false, entries:[]}` → `[]`.
- `undefined` / `null` → `[]`.
- `getTotalExerciseMinutes` sums valid durations; treats `null`/missing as 0.
- `getTotalExerciseMinutes` of legacy shape returns the single duration.
- `progressMetrics.exerciseMinutes(day)` returns the sum for the new shape; returns the legacy value for old rows; returns null when there are no entries at all.
- `dayDataValidator.validateDayData` rejects non-array `entries`, negative durations, durations > 480 min, non-string types.

**Verification:**
- Vitest for each new helper + updated progressMetrics.
- Existing progressMetrics tests updated (new fixtures) still pass — no behavioural regression for single-entry data.

---

- [ ] **Unit 4: Multi-activity — ExerciseCard UI**

**Goal:** ExerciseCard (and Mobilise, symmetric) renders the list of entries, a total summary, per-row remove, and a "+ Add another" affordance.

**Requirements:** R6, R7, R8.

**Dependencies:** Unit 3.

**Files:**
- Modify: `src/components/habits/ExerciseCard.jsx`
- Modify: `src/components/habits/ExerciseCard.test.jsx`

**Approach:**
- New internal states: `mode: 'idle' | 'picking-type' | 'picking-duration'`. When entries is empty, idle shows the habit card header only; when entries are present, idle shows the summary + rows + "+ Add another".
- Adding: tap "+ Add another" → picking-type. Choose a type → picking-duration (preset chips + custom input). Confirm → push entry.
- Removing: × on each row calls `onChange({ ...value, entries: entries.filter(e => e !== row), completed: newEntries.length > 0 })`.
- Summary line format: `Total: 1h 15m · 3 activities` (hide when 0 entries).
- Preserve keyboard + screen-reader accessibility of the existing card.
- Mobilise uses the same component; the `habit` prop differentiates.

**Execution note:** Execution target: codex-delegate.

**Patterns to follow:**
- Current `ExerciseCard.jsx` layout tokens.
- `HydrateCard.jsx` inline-summary pattern.

**Test scenarios:**
- Empty entries → card shows the placeholder desc, no rows, no summary.
- Single entry shown with correct type + duration + × button.
- Multiple entries show all rows + correct total summary string.
- Tapping "+ Add another" opens type picker.
- Confirming a new entry calls `onChange` with the extended `entries` array and `completed: true`.
- Tapping × on the only entry calls `onChange` with `entries: []` and `completed: false`.
- Keyboard: tab order passes through all rows + add button.
- Backward-compat render: given legacy `{ completed:true, type:'Running', duration_minutes:30 }`, card renders a single row and total 30 min.

**Verification:**
- `npx vitest run src/components/habits/ExerciseCard.test.jsx` green.
- Manual smoke: add + remove + re-add entries on Check In; summary + total update live.

---

- [ ] **Unit 5: Multi-activity — downstream surfaces (progress + broadcast semantics)**

**Goal:** Progress page duration totals honour all entries; the "Someone special" broadcast still fires exactly once per first-entry transition (R11).

**Requirements:** R10, R11.

**Dependencies:** Units 3, 4.

**Files:**
- Modify: `src/lib/progressMetrics.js` (via helper from Unit 3)
- Modify: `src/pages/Progress.jsx` — if there's a per-activity breakdown chart, switch it to aggregate over entries.
- Verify only (no change expected): `src/contexts/DataContext.jsx` — flip detector already keys on `exercise.completed`, which stays a writer-maintained boolean.
- Modify: `src/contexts/DataContext.test.jsx` — add a regression test: saving today's exercise with a second entry does NOT fire an additional broadcast.

**Approach:**
- Confirm via a test that adding a second entry when `completed` is already true produces zero broadcasts.
- Confirm the notification body still says `"Someone special has just completed 30 min of Running"` using the FIRST entry's type + duration (for multi-entry first-flip saves where the user added several at once before saving, we take the first entry).
- The message composer `composeMessage({ activity: 'exercise', exerciseType, durationMinutes })` stays the same contract.
- Flip payload builder in `activityNotifications.js` reads `exerciseType = next.exercise.entries?.[0]?.type ?? next.exercise.type` and `durationMinutes = next.exercise.entries?.[0]?.duration_minutes ?? next.exercise.duration_minutes`. Backward compatible; picks up the first entry of the new shape, falls back to the legacy top-level fields.

**Execution note:** Execution target: codex-delegate.

**Patterns to follow:**
- `detectActivityFlips` existing shape — extend its exercise reader to handle entries.
- `src/lib/activityNotifications.test.js` — extend fixture coverage.

**Test scenarios:**
- Save today with one entry (first flip) → broadcast fires once with the first entry's type + duration.
- Save today, then save again adding a second entry (completed still true) → no broadcast on the second save.
- Remove all entries (flip back to false), then add one → broadcast fires again.
- Progress's `exerciseMinutes` is the sum of all entries.

**Verification:**
- All extended unit + integration tests green.
- `detectActivityFlips` specifically has new fixtures for multi-entry.

---

- [ ] **Unit 6: CHANGELOG + version bump + plan checkboxes**

**Goal:** 0.14.0 metadata published; project docs reflect the shipped scope.

**Requirements:** none directly; release hygiene.

**Dependencies:** Units 1–5.

**Files:**
- Modify: `package.json` — `0.13.1` → `0.14.0`.
- Modify: `CHANGELOG.md` — NEW top entry `[0.14.0]` with **What's new** (iOS notifications now fire on your phone; viewport locks; multiple exercises per day) and **Under the hood** (SW routing, viewport meta + CSS, entries array + helpers + backward-compat readers, broadcast-semantics guard, test counts).
- Modify: `docs/plans/2026-04-19-002-feat-ios-push-viewport-multi-activity-beta-plan.md` — tick unit checkboxes.
- Modify: `docs/handoff/handoff.md` — new entry.

**Execution note:** Execution target: claude — judgement-heavy release metadata, should not be automated blindly.

**Test scenarios:**
- N/A (doc changes).

**Verification:**
- `npx vitest run` — **full suite green** (target ~780 tests, existing 760 + ~20 new across Units 1/3/4/5).
- `npm run build` exits 0.
- `npm run lint` 0 errors.
- Footer shows `v0.14.0 (sha7)` on the Vercel preview.

## System-Wide Impact

- **Interaction graph:** `CheckIn → ExerciseCard → saveDay → detectActivityFlips → sendActivity + (self-echo) → browserNotifications.showNotification → ServiceWorkerRegistration.showNotification`. The pivot in this plan is the last hop switching from constructor to SW. All upstream callers are unchanged.
- **Error propagation:** all failures still fire-and-forget. SW `showNotification` rejection falls back to constructor; both paths return `false` silently.
- **State lifecycle risks:** the new `entries` array is a plain value; React state updates via the existing optimistic-update path. No new effects, no new context, no new subscriptions.
- **API surface parity:** the broadcast payload contract is unchanged (`{activity, exerciseType?, durationMinutes?}`). Multi-activity is a client-side concern; other users' clients receive the same shape.
- **Integration coverage:** the manual QA loop stays the same (two browsers, two users, confirm broadcast); add one step to "log three exercises in one day, confirm only one broadcast fires".

## Risks & Dependencies

- **Risk: iOS `navigator.serviceWorker.ready` hangs if the SW is broken.** Mitigated by a 2-second timeout + constructor fallback.
- **Risk: viewport lock breaks desktop keyboard input.** Desktop browsers ignore `user-scalable=no`, so no regression there. Low risk.
- **Risk: legacy rows render incorrectly.** Mitigated by `getExerciseEntries` compat shim + explicit test fixtures for pre-0.14 shape.
- **Risk: flip detector double-fires on multi-entry saves.** Not possible — the detector keys on `completed: false → true`, not on entry count. Explicit regression test.
- **Risk: scoring breaks.** Scoring reads `completed`, which the writer still maintains correctly. Unchanged — but the existing scoring tests serve as a regression guard.
- **Dependency: no new npm packages.** `ServiceWorkerRegistration.showNotification` is native. Viewport + CSS are HTML/CSS. Multi-activity is pure JS.
- **Dependency: no Supabase migration.** `daily_entries.exercise` is JSONB — any shape change is DB-safe.

## Documentation / Operational Notes

- **User-facing:** CHANGELOG 0.14.0 entry is the only net-new doc. **What's new** addresses the user's direct frustrations (notifications fire; no more pinch-zoom; multiple exercises) in plain language.
- **Developer-facing:** `src/lib/habits.js` JSDoc on the new helpers records the shape contract + backward-compat intent. `src/lib/browserNotifications.js` carries a comment explaining the iOS rationale for SW preference.
- **Operational:** no env vars, no secrets, no Edge Function.
- **Handoff log:** append an entry on completion — iOS PWA notifications now work, viewport locked, multi-activity shipped. Note that the legacy shape still exists in the DB and a future housekeeping migration could re-emit in the new shape.

## Sources & References

- Plan: [docs/plans/2026-04-19-001-feat-activity-push-notifications-beta-plan.md](2026-04-19-001-feat-activity-push-notifications-beta-plan.md) — the 0.12.0 plan this extends.
- Decisions: [docs/decisions/decisions.md](../decisions/decisions.md) — 2026-04-19 opt-out + iOS SW routing entries.
- Code: `src/lib/browserNotifications.js`, `src/lib/habits.js`, `src/components/habits/ExerciseCard.jsx`, `src/contexts/DataContext.jsx`, `src/lib/progressMetrics.js`, `src/sw.template.js`, `index.html`, `src/index.css`.
- External: MDN `ServiceWorkerRegistration.showNotification`; Apple developer notes on PWA notifications (iOS 16.4+); web.dev viewport-in-standalone-mode.

## Routing summary

| Unit | Runner | Rationale |
|------|--------|-----------|
| 1 iOS SW-routed notifications | codex-delegate | Tight contract; feature-detect + fallback. |
| 2 Viewport lock | codex-delegate | Meta + CSS string change. |
| 3 Multi-activity helpers + validator | codex-delegate | Pure helpers, fixture-driven tests. |
| 4 ExerciseCard UI | codex-delegate | Follows existing card idiom. |
| 5 Downstream surfaces + broadcast guard | codex-delegate | Small reader updates + one regression test. |
| 6 CHANGELOG + version bump | claude | Release-narrative judgement. |

Five of six units delegate to codex once the plan is locked; Claude stays in the loop only for the release metadata.
