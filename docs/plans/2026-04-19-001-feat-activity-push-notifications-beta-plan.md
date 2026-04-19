---
title: "feat: Activity push notifications (\"Someone special\")"
type: feat
status: active
date: 2026-04-19
---

# feat: Activity push notifications ("Someone special")

## Overview

Surface a browser notification to every whitelisted WLC user (except the one who did it) the moment a peer completes Exercise, Well-being, Reflexion, or hits their daily Hydration target. The notification intentionally hides the sender's identity behind the phrase "Someone special" — the point is social encouragement, not scoreboard gossip.

Target version: **0.12.0** (minor — new feature, new preference, new tracked events).

## Problem Frame

The WLC app is used by a tiny whitelisted group (currently four). They all know each other outside the app. During the challenge, individual wins go unseen — Barney finishes a 45-min bike ride at 6am and the only person who knows is Barney. A lightweight "someone else is working" signal provides social accountability without either naming people or requiring them to post anything. The user-supplied framing ("Someone special has just completed &lt;activity&gt;") is deliberately affectionate and deliberately anonymous: every whitelisted user is special, and every completion is worth a quiet celebration.

## Requirements Trace

- **R1.** When a user flips Exercise, Well-being, or Reflexion from incomplete → complete on *today's* entry, every other whitelisted user with the app open receives a browser notification.
- **R2.** When a user's hydration `current_ml` first crosses their target for the day, the same notification fires. Subsequent hydration taps that stay at/above target do not re-fire.
- **R3.** Exercise notifications include duration when `exercise.duration_minutes` is set (e.g. "Someone special has just completed 30 min of Running"). If only type is known, fall back to "Someone special has just completed Running". If neither is set, fall back to "Someone special has just completed an exercise".
- **R4.** The sender never receives their own notification.
- **R5.** Notifications are **opt-out** via a toggle on `/preferences`. Default is ON. Because the browser Notification permission itself still requires a user gesture, the preference being ON does not auto-prompt — the toggle on `/preferences` is the gesture-source for `requestPermission()` when permission is still `default`.
- **R6.** No identifying content ever lands in the notification body or the broadcast payload — no display name, no user ID, no reflexion text, no well-being description.
- **R7.** Back-dated edits (user clicks into yesterday and ticks Reflect) do NOT fire notifications. Only today's flips fire.

## Scope Boundaries

- **Out of scope:** true background Web Push via service worker + VAPID + Supabase Edge Function. The user picked "in-app realtime only" for this release. A follow-up plan can layer background push on top of the same sender logic later.
- **Out of scope:** notifications for Mobilise, Sleep, Nutrition. User explicitly listed the four.
- **Out of scope:** per-user notification preferences beyond a single global on/off toggle (no per-activity filters).
- **Out of scope:** notification history / replay / missed-while-offline. If nobody has the app open when Barney saves, the moment is gone — that is the trade-off of the simpler architecture.
- **Out of scope:** iOS PWA background notifications. These would require the full Web Push path and are deferred.
- **Out of scope:** mobilise + nutrition celebrations. Deliberate.

## Context & Research

### Relevant Code and Patterns

- **Activity save path:** `src/contexts/DataContext.jsx` `saveDay` is the single choke-point where every habit mutation lands. This is where flip-detection lives and where the broadcast `send` is wired. The function already receives both the date and the full new `dayData`; it holds the previous day via the `data` state in React, so a diff is cheap.
- **Per-user preferences:** `src/lib/adminConfig.js` `PERSONALISABLE_KEYS` + `sanitisePreferences` is the existing pattern for profile-level settings. The notification-enabled flag plugs in the same way (new key `notificationsEnabled`, boolean, **default `true`** — opt-out).
- **Preferences UI:** `src/pages/MyPreferences.jsx` already renders a list of per-key cards with help text + Save button. The toggle for notifications follows the same card shape but renders a toggle switch instead of a number input.
- **Empty-day shape:** `src/lib/habits.js` `emptyDay()` already includes `exercise.duration_minutes` and a boolean `completed` on every habit — no schema changes needed.
- **Realtime precedent:** `supabase/migrations/20260412000005_leaderboard_realtime_and_cumulative.sql` enables Realtime on `profiles` for the leaderboard. The leaderboard subscriber in the Leaderboard page is a working reference for `supabase.channel().on().subscribe()`.
- **Hydration target-hit detection:** `HydrateCard` at `src/components/habits/HydrateCard.jsx` derives `completed = currentMl >= targetMl` and writes it back on every tap. Treat `prev.hydrate.completed === false && next.hydrate.completed === true` as the single-fire signal.
- **Analytics wrapper:** `src/lib/analytics.js` is the pattern for a thin facade that enforces PII rules in one place. The new notifications module follows the same shape.
- **`isLocal` guard:** `DataContext.isLocal` already branches on `user?.email === 'local'` and bypasses Supabase. Broadcast sends must sit behind the same guard so the dev local mode never calls `supabase.channel()`.
- **Service worker:** `src/sw.template.js` is hand-rolled and intentionally minimal. This plan does NOT touch it — the Notification API here is called from the page context, not the SW. The global CLAUDE.md rule about not adding deps without reason applies; everything in this plan is hand-rolled against `navigator.*` and `supabase.channel()`.

### Institutional Learnings

- Hand-rolling small bits of PWA infrastructure beats pulling in a library with transitive CVEs (see the `sw.template.js` comment block — same reasoning applies to notifications).
- Broadcast-channel messages bypass RLS, which is exactly what we want. If we used `postgres_changes` on `daily_entries`, RLS would restrict each user to their own rows and no peer events would flow. Broadcast is also schema-free — no migration, no publication change.
- The 4-user whitelist means we do not need to rate-limit, batch, or deduplicate beyond the browser-level `tag`-based dedup. A brute-force 1-message-per-flip approach is fine.
- The `self: false` default on Supabase Realtime broadcast channels means the sender never receives their own broadcast, satisfying R4 without any client-side filtering.
- Migration 0.10.3 (`fix(sw): force SW update checks`) is a reminder that iOS Safari PWAs are fiddly about lifecycle. We sidestep that risk entirely by keeping notifications in-page rather than in the SW.

### External References

- MDN: Notification API — permission model, `tag` dedup, `icon`, `silent`, `renotify` semantics.
- Supabase Realtime (v2) — `channel().on('broadcast', { event: 'activity' }, cb).subscribe()`; `{ config: { broadcast: { self: false } } }` default.
- W3C Push API spec — intentionally not used; listed here so the next plan (background push) can find the pointer.

## Key Technical Decisions

- **Broadcast channel over postgres_changes.** Sidesteps RLS (daily_entries is scoped to `user_id = auth.uid()`), needs no migration, keeps the payload explicitly anonymised, and avoids enabling Realtime publication on a table that carries reflexion text + well-being activity text.
- **Flip detection in `DataContext.saveDay`.** It is the only path every save flows through, it already has both `prev` (via `data` state) and `next` (the argument). Co-locating detection with the save means we never miss a save and never double-fire.
- **Today-only gate at the sender.** Back-dated edits never emit a broadcast. Compared to filtering at the subscriber (where we'd need to pass a date in the payload), this keeps the payload minimal and avoids partial leaks.
- **Single channel, one event type.** `channel('activity-celebrations')`, `event: 'activity'`. Payload shape: `{ activity: 'exercise' | 'wellbeing' | 'reflect' | 'hydrate', exerciseType?: string, durationMinutes?: number }`. Deliberately flat, deliberately anonymous.
- **Opt-out default, permission still gesture-sourced.** The preference defaults to `true` so new users are in by default; the browser Notification permission is a separate, user-gesture-gated gate. The toggle on `/preferences` is the only place that calls `Notification.requestPermission()`. When the preference is `true` but `Notification.permission === 'default'`, `/preferences` renders an inline "Grant browser permission" button next to the toggle.
- **Notification `tag`.** Tag each notification `wlc-${activity}-${yyyymmdd}` so repeat-day target-hit or duplicate broadcasts coalesce into a single OS notification rather than stacking.
- **No schema change.** Notification preference lives inside the existing `profile.preferences` JSONB. No migration, no manual apply step.
- **Sender is also a subscriber.** The same app instance subscribes and sends; `self: false` ensures they do not see their own message. Keeps the module simple — one `useEffect` for subscribe, one call from `saveDay` for send.
- **Dev / local-mode bypass.** The full path is gated on `user && !isLocal` + `supabase` being non-null. In local mode the broadcast is a no-op and the subscriber is not attached.

## Open Questions

### Resolved During Planning

- **Delivery mechanism?** In-app realtime only via Supabase Broadcast + browser Notification API. (User decision.)
- **Default state?** Notifications ON by default (opt-out). User can still toggle off on `/preferences`. (User decision, 2026-04-19.)
- **Which activities?** Exercise (with duration), Well-being, Reflexion, Hydration target-hit. (User decision.)
- **Self-notify?** No — exclude the sender. (User decision + `self: false` default.)
- **RLS risk on postgres_changes?** Avoided entirely by using a broadcast channel.
- **Schema change?** None required — reuses `profile.preferences`.
- **Back-dated edits?** Gate by `date === today()` at the sender.
- **Hydration per-tap spam?** Fire only on the `false → true` completed transition; subsequent taps that stay completed do nothing.

### Deferred to Implementation

- **Permission-denied UX.** If the user toggles on but the browser denies permission, we should show a one-liner in the Preferences card telling them to re-enable in browser settings. Exact copy to be chosen during implementation.
- **Icon path.** `/icon-192.svg` exists; whether the browser renders SVG notification icons cleanly on iOS Safari vs desktop Chrome will be tested in-browser during QA. May need a PNG fallback — deferred until the smoke test says so.
- **Unsubscribe on sign-out.** Strongly implied: when `user` becomes null the subscriber effect cleans up. Exact shape (effect dep array vs explicit channel ref) is an implementation detail.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌──────────── Barney's tab ────────────┐        ┌──────────── Anna's tab ────────────┐
│  CheckIn (flips exercise.completed)   │        │  Subscriber (mounted at App level)  │
│            │                          │        │            ▲                        │
│            ▼                          │        │            │                        │
│  DataContext.saveDay(today, dayData)  │        │  channel('activity-celebrations')   │
│   1. localSave + setData              │        │     .on('broadcast', {event:'act'}) │
│   2. detectFlips(prev, next)          │        │                                     │
│   3. enqueue upsertEntry              │        │  compose message →                  │
│   4. for each flip today:             │        │  new Notification(title, {          │
│       channel.send({                  │        │      body, tag, icon                │
│         type:'broadcast',             │        │  })                                 │
│         event:'activity',             │        │                                     │
│         payload:{activity,            │        │                                     │
│                 exerciseType,         │        │                                     │
│                 durationMinutes}})    │        │                                     │
└───────────────────────────────────────┘        └─────────────────────────────────────┘
           │                                                     ▲
           │                                                     │
           └──────── Supabase Realtime (broadcast, self:false) ──┘
```

Message composition rules (directional):

```
exercise:
  type + duration → "Someone special has just completed {duration} min of {type}"
  type only       → "Someone special has just completed {type}"
  neither         → "Someone special has just completed an exercise"
wellbeing         → "Someone special has just completed a well-being activity"
reflect           → "Someone special has just completed their daily reflection"
hydrate           → "Someone special has just hit their hydration target"
```

## Implementation Units

- [x] **Unit 1: Activity-flip detection + message composition (pure helpers)**

**Goal:** Pure, test-covered helpers that (a) diff two `dayData` objects to yield the list of activity flips worth announcing and (b) compose the user-facing notification title + body for each flip.

**Requirements:** R1, R2, R3, R4 (payload shape), R7 (today-only handled by the caller passing the date).

**Dependencies:** none.

**Files:**
- Create: `src/lib/activityNotifications.js`
- Test: `src/lib/activityNotifications.test.js`

**Approach:**
- Export `detectActivityFlips(prevDay, nextDay)` returning `Array<{ activity, exerciseType?, durationMinutes? }>`. Activities to diff: `exercise`, `wellbeing`, `reflect`, `hydrate`. Only emit when `prev.completed === false && next.completed === true`. Handle undefined/null prev (first save of the day) by treating missing as `{ completed: false }`.
- Export `composeMessage(flip)` returning `{ title, body }`. Title is a fixed string (e.g. "Whole Life Challenge"). Body uses the rules in the High-Level Technical Design above.
- Export a constant `NOTIFICATION_TAG_PREFIX = 'wlc-activity-'` and a helper `tagFor(flip, dateISO)` that returns `${prefix}${activity}-${dateISO.replace(/-/g,'')}`.

**Execution note:** Execution target: codex-delegate. Pure helpers with fixture-driven tests — ideal for delegation. Test-first: write the table of prev/next fixtures and expected output before implementation.

**Patterns to follow:**
- `src/lib/scoring.js` / `src/lib/bonuses.js` — pure helpers with plain-JSON inputs and vitest coverage.
- `src/lib/adminConfig.js` `sanitisePreferences` — small export surface, explicit table of accepted keys.

**Test scenarios:**
- Exercise flips false→true with both type and duration → one flip with both fields.
- Exercise flips false→true with type only → flip has no duration.
- Exercise flips false→true with neither → flip has activity only.
- Exercise stays true across calls → no flip.
- Exercise goes true→false (user undid) → no flip.
- Wellbeing flips → flip emitted; `activity_text` is NOT in the payload.
- Reflect flips → flip emitted; `reflection_text` is NOT in the payload.
- Hydrate flips false→true → flip emitted.
- Hydrate stays true as current_ml keeps climbing → no flip.
- Prev dayData is `undefined` (first write of the day, flips already true) → flips emitted (treat undefined as all-false).
- Multiple activities flip in one save → all flips returned, in a stable order.
- `composeMessage` covers every activity + every fallback combination above.
- `tagFor` is stable for the same `(activity, date)` and differs when either changes.

**Verification:**
- `npx vitest run src/lib/activityNotifications.test.js` passes every scenario above.
- 100% branch coverage on the composition helper (small enough to bar this).

---

- [x] **Unit 2: Browser notification wrapper + permission helper**

**Goal:** A thin, testable wrapper around `window.Notification` that requests permission, reports status, and shows a notification — with graceful no-ops when the API is missing (SSR, older Safari, tests).

**Requirements:** R5 (permission gesture), R6 (no PII leaks).

**Dependencies:** Unit 1 (consumes `composeMessage` output shape but doesn't import it).

**Files:**
- Create: `src/lib/browserNotifications.js`
- Test: `src/lib/browserNotifications.test.js`

**Approach:**
- Export `isNotificationSupported()` → boolean.
- Export `getPermission()` → `'default' | 'granted' | 'denied' | 'unsupported'`.
- Export `requestPermission()` → resolves the same union. Wraps the promise form; must not throw.
- Export `showNotification({ title, body, tag, icon })` → resolves true/false. No-op + false when permission !== 'granted' or API missing.
- Default `icon` to `'/icon-192.svg'`. Default `silent: false`. Never include any caller-supplied PII beyond the title/body already composed by Unit 1.

**Execution note:** Execution target: codex-delegate. Wrapper-around-browser-API is mechanical once the contract is specified.

**Patterns to follow:**
- `src/lib/analytics.js` — thin facade, PII stripping at the edge, graceful degradation.
- `src/lib/serviceWorker.js` — feature-detection with `typeof navigator === 'undefined'` guards for test/SSR contexts.

**Test scenarios:**
- `window.Notification` absent → `isNotificationSupported()` false; everything else returns the `unsupported`/false path.
- Permission `default` → `requestPermission()` delegates to the browser, returns the result.
- Permission `denied` → `showNotification` returns false without calling `new Notification`.
- Permission `granted` → `showNotification` constructs `Notification` with title, body, tag, icon exactly once.
- `requestPermission()` rejection → swallowed, returns `'denied'`; does not throw.
- `tag` is passed through so repeat calls coalesce at the OS level.

**Verification:**
- Vitest coverage via a mocked `window.Notification` constructor spy.
- Manual smoke: in the dev server, call `window.__wlc_test_notif()` (temporary expose via vite env flag during QA only) → a notification appears; duplicate calls with the same tag do not stack.

---

- [x] **Unit 3: Preference schema extension + My Preferences toggle**

**Goal:** Add `notificationsEnabled` (boolean, **default true** — opt-out) to the personalisable-preferences pipeline, and render a toggle on `/preferences` that also handles the permission request.

**Requirements:** R5, R6 (enforcement at preference boundary).

**Dependencies:** Unit 2.

**Files:**
- Modify: `src/lib/adminConfig.js` (extend `PERSONALISABLE_KEYS`, extend `sanitisePreferences` to accept a boolean key, extend `DEFAULT_CONFIG` with `notificationsEnabled: true`).
- Modify: `src/lib/adminConfig.test.js` (cover the new key's sanitisation + default behaviour).
- Modify: `src/pages/MyPreferences.jsx` (add toggle card; when toggling on, call `requestPermission()` and if denied, surface the inline warning).
- Modify: `src/pages/MyPreferences.test.jsx` (cover: toggle on → requestPermission called; denied → warning visible; saved → preference persisted).

**Approach:**
- `sanitisePreferences` currently uses `PREFERENCE_RANGES` (numeric). Introduce a parallel `PREFERENCE_TYPES` map so each key knows whether it is `'number'` or `'boolean'`; numbers keep range-checking, booleans coerce via `Boolean()` and persist BOTH `true` and `false`. Existing numeric keys carry on unchanged.
- In `MyPreferences.jsx`, render the toggle as a new card above the numeric cards (separation: "Notifications" heading, then "Targets" heading for the existing trio). Toggle is a styled `<input type="checkbox">`.
- Because the default is `true`, a user landing on `/preferences` for the first time sees the toggle already ON. If `Notification.permission === 'default'`, render an inline "Grant browser permission" button that calls `requestPermission()` (user gesture). If the user grants → hide the button. If denied → replace the button with a dim one-liner explaining how to re-enable via browser settings.
- When the user flips the toggle off → persist `{ notificationsEnabled: false }` immediately.
- When the user flips it back on after off → persist `{ notificationsEnabled: true }` (explicit) and, if permission is still `default`, same "Grant" CTA appears.
- Track the preference change via `analytics.track('notifications_toggled', { enabled })` (no PII — the global analytics wrapper already strips).

**Execution note:** Execution target: codex-delegate. Follows the exact shape of the existing preferences cards.

**Patterns to follow:**
- Existing `MyPreferences.jsx` card layout + save flow (don't invent new UI idiom).
- `sanitisePreferences` extension pattern — preserve "silently drop junk" behaviour.

**Test scenarios:**
- `sanitisePreferences({ notificationsEnabled: true })` → `{ notificationsEnabled: true }`.
- `sanitisePreferences({ notificationsEnabled: false })` → `{ notificationsEnabled: false }` (booleans persist both values — different from numbers, which only persist overrides).
- `sanitisePreferences({ notificationsEnabled: 'yes' })` → coerces to `true`.
- `sanitisePreferences({ notificationsEnabled: 0 })` → coerces to `false`.
- `DEFAULT_CONFIG.notificationsEnabled` is `true`.
- Profile with no `preferences.notificationsEnabled` key → `getEffectiveConfig(profile).notificationsEnabled === true`.
- Profile with `preferences.notificationsEnabled === false` → `getEffectiveConfig(profile).notificationsEnabled === false`.
- On `/preferences` mount with permission already granted → toggle ON, no "Grant permission" button visible.
- On `/preferences` mount with permission === `default` → toggle ON, "Grant browser permission" button visible.
- Clicking the Grant button with permission === `default` → calls `requestPermission` once; on granted the button disappears; on denied a dim one-liner replaces it.
- Toggle off → saves `{ notificationsEnabled: false }`; no permission side effects.
- Toggle back on after off → saves `{ notificationsEnabled: true }` and, if permission still default, Grant CTA reappears.

**Verification:**
- `npx vitest run src/pages/MyPreferences.test.jsx src/lib/adminConfig.test.js` passes.
- Manual smoke: toggle on → OS prompt appears; after grant, save succeeds and the card shows the override indicator.

---

- [x] **Unit 4: Broadcast sender — wire flip detection into `saveDay`**

**Goal:** When a save lands on today's date and produces a flip (per Unit 1), emit one broadcast message per flip on the shared channel. Never block the save path on the broadcast.

**Requirements:** R1, R2, R3, R4 (indirectly, via `self: false`), R6, R7.

**Dependencies:** Units 1, 2 (just for the `supabase.channel()` API shape), 3 (preference gate).

**Files:**
- Modify: `src/contexts/DataContext.jsx` — add a broadcast-sender effect or ref-captured channel, diff prev vs next in `saveDay`, send per flip.
- Modify: `src/contexts/DataContext.test.jsx` — cover: save flipping exercise on today → channel.send called with exercise payload; save on yesterday → no send; isLocal → no send; no user → no send.
- Create: `src/lib/activityBroadcaster.js` — a tiny module that owns the channel ref + `sendActivity(flip)` so DataContext stays readable.
- Test: `src/lib/activityBroadcaster.test.js` — unit-level coverage of the module with a fake supabase client.

**Approach:**
- `activityBroadcaster.js` exposes `getChannel(client)` (memoised, subscribes lazily with `{ config: { broadcast: { self: false } } }`), `sendActivity(flip)` (no-op if client null or channel unsubscribed), and `teardown()`.
- In `DataContext.saveDay`, before the `localSaveDay` write (so we capture `prev`), compute `prev = data[date]`. After the optimistic `setData`, if `!isLocal && user && date === getToday()`, call `detectActivityFlips(prev, dayData)` and for each flip call `sendActivity(flip)`. Send is fire-and-forget; failures are swallowed.
- Respect the preference gate on the SENDER too: only send when `profile.preferences.notificationsEnabled !== false`. Rationale: if the user opted out, they explicitly do not want to participate in the broadcast circle either way — their flips do not announce. (Opting out is symmetric.)
- **Do not** subscribe to the channel inside DataContext — that is Unit 5's job. DataContext's channel ref is send-only.

**Execution note:** Execution target: codex-delegate. The contract is tight; tests around the mocked supabase client are the main design work.

**Patterns to follow:**
- Existing `saveDay` optimistic-update + queue.enqueue shape; do not break the return value.
- `src/lib/saveQueue.js` fire-and-forget resilience.

**Test scenarios:**
- Save on today with exercise flipping false→true + duration set → `sendActivity` called once with `{activity:'exercise', exerciseType, durationMinutes}`.
- Save on today with two flips (exercise + hydrate) → two calls, both payloads match.
- Save on yesterday → zero calls.
- Save in local mode (`isLocal=true`) → zero calls; channel never constructed.
- Save when `profile.preferences.notificationsEnabled === false` → zero calls.
- Save when supabase client is null → zero calls, no throw.
- `sendActivity` when channel is not yet subscribed → queued / dropped silently (assert the promise resolves without throw).
- The saveDay return value is unchanged by the broadcast path (no regression for existing callers).

**Verification:**
- Vitest: `DataContext.test.jsx` and `activityBroadcaster.test.js` green.
- Manual smoke (see Unit 6) will cross-check with a real channel.

---

- [x] **Unit 5: Subscriber wiring at app level**

**Goal:** Mount a subscriber exactly once, when the user is signed in, whitelisted (non-local), and has `notificationsEnabled === true`. On receipt, compose + show the notification.

**Requirements:** R1, R2, R3, R4 (via `self: false`), R5.

**Dependencies:** Units 1, 2, 3, 4.

**Files:**
- Create: `src/components/ActivityNotifier.jsx` — headless component; mounts inside `DataProvider` (same scope as `CheckIn`, so profile + user are available). Subscribes to the channel on mount; tears down on unmount or when the preference flips off.
- Modify: `src/App.jsx` — add `<ActivityNotifier />` immediately inside `<Layout>` (or just above `<Routes>`). No visible UI.
- Test: `src/components/ActivityNotifier.test.jsx`.

**Approach:**
- Use `useEffect` keyed on `[user?.id, isLocal, profile?.preferences?.notificationsEnabled, permission]` to lazily subscribe / unsubscribe.
- On `broadcast` event, call `composeMessage(payload)` then `showNotification({ ...message, tag: tagFor(payload, getToday()) })`.
- Guard: if the runtime permission check returns !granted at the moment of receipt, drop the message (user could have revoked mid-session).
- Guard: ignore malformed payloads (unknown activity key) — `composeMessage` returns null in that case.

**Execution note:** Execution target: codex-delegate. The effect lifecycle is the main thing to test; the component is headless.

**Patterns to follow:**
- `src/components/UpdateToast.jsx` and the `registerServiceWorker` effect in `App.jsx` — ephemeral effect, cleanup on unmount.
- `self: false` default in the same `supabase.channel()` call that Unit 4 uses; share the channel ref via `activityBroadcaster.getChannel(supabase)`.

**Test scenarios:**
- User signed in, non-local, notificationsEnabled=true, permission=granted → channel subscribed on mount.
- Preference flipped off at runtime → channel unsubscribed; further broadcasts produce no notification.
- Receiving a valid `exercise` payload with duration → `showNotification` called once with the composed message + tag.
- Receiving a `wellbeing` payload → notification body matches the fixed string (no activity_text leak possible because sender never includes it).
- Receiving a payload with `activity: 'mobilize'` (not in our whitelist) → no notification.
- User signs out → unsubscribe fires, no dangling listener.
- Permission revoked mid-session → next broadcast produces no notification.

**Verification:**
- Vitest: `ActivityNotifier.test.jsx` green, including lifecycle cases.
- Manual E2E (Unit 6): two different browsers signed in as two different whitelisted users, one saves today's exercise, the other sees the OS notification.

---

- [x] **Unit 6: Integration smoke test, CHANGELOG, version bump** *(code units done; live two-browser smoke test still pending user action)*

**Goal:** End-to-end verification with a real Supabase channel; documentation + version metadata ready for release.

**Requirements:** R1–R7 proven in a live browser pair.

**Dependencies:** Units 1–5.

**Files:**
- Modify: `CHANGELOG.md` — new top entry under version 0.12.0 with **What's new** + **Under the hood** sections per project rules.
- Modify: `package.json` — `version` → `0.12.0`.
- Modify: `src/pages/Info.jsx` or the equivalent "What's new" surface if it already lists recent features (spot-check for the existing pattern before touching it).

**Approach:**
- Use the existing Vite dev server and two browsers (e.g. regular Chrome + incognito) signed in as two different whitelisted users.
- In browser A, open `/preferences`, toggle Notifications on, grant permission.
- In browser B, open `/preferences`, toggle Notifications on, grant permission.
- In browser B, open `/`, complete 30 min of Running.
- Confirm in browser A a notification appears with body "Someone special has just completed 30 min of Running".
- Repeat for wellbeing, reflexion, and hydration target-hit.
- Confirm the sender does NOT get the notification.
- Confirm back-dating (flipping on yesterday) does NOT fire.
- Confirm toggling off in browser A then repeating the run → no notification in A.

**Execution note:** Execution target: claude (human + Claude pair), not codex-delegate. This is judgement work (real browsers, real permission prompts) and should not be automated blindly.

**Patterns to follow:**
- CHANGELOG format: WLC rule — every release has **What's new** (customer-facing) and **Under the hood** (technical) subsections.
- Version bump in same commit as the feature work.

**Test scenarios:**
- All six smoke-test steps above pass.
- `npx vitest run` full suite green (530+ tests after this feature's coverage is added).
- `npm run build` exits 0.
- `npm run lint` has zero errors.

**Verification:**
- All items above green.
- PR body calls out: no migration required; notifications are in-app realtime only; permission is user-gesture-gated; no new runtime deps.

## System-Wide Impact

- **Interaction graph:** `CheckIn → DataContext.saveDay → activityBroadcaster.sendActivity → supabase.channel.send`. `ActivityNotifier (App level) ← channel broadcast ← browserNotifications.showNotification`. No other caller mutates `dayData`, so flip detection is fully co-located.
- **Error propagation:** every step in the notification path is fire-and-forget. A broadcast failure must never block `saveDay`'s resolve. A `showNotification` failure must never crash the subscriber — log once, continue.
- **State lifecycle risks:** the subscriber must unsubscribe on sign-out, preference toggle-off, and unmount. Failure mode is a leaked channel subscription (benign but wasteful) or a double-subscribe fire (visible as duplicate notifications) — both caught by Unit 5 tests.
- **API surface parity:** the broadcast payload is a public contract between sender and subscriber. When we later add background Web Push, the Edge Function must produce the exact same payload shape so the subscriber code is unchanged. Record the payload contract in `activityNotifications.js` JSDoc (one-liner) so a future implementer sees it.
- **Integration coverage:** the two-browser smoke test in Unit 6 is the only way to prove the round-trip; unit tests with mocked channels cannot catch a real Realtime misconfiguration.

## Risks & Dependencies

- **Risk: duplicate notifications across tabs.** Mitigation: consistent `tag` means the OS coalesces; the subscriber dedup is an observable side effect.
- **Risk: iOS Safari PWA background behaviour.** If the PWA is backgrounded on iOS, foreground notifications may still land depending on iOS version. Out of scope — explicitly deferred to the Web Push follow-up. Users are told in CHANGELOG "works when the app is open".
- **Risk: Realtime outage.** If Supabase Realtime is down, saves still succeed (fire-and-forget broadcast); subscribers just see nothing. No data loss, no UI break.
- **Risk: preference race.** A user toggles off, but an in-flight broadcast still arrives. Acceptable — at most one stray notification; the next broadcast will be blocked at the subscriber effect.
- **Risk: permission API differences (old Safari).** The wrapper's `isNotificationSupported` + unsupported branch neutralises this — the toggle simply reports the feature as unavailable.
- **Dependency:** no new npm packages. Uses only `@supabase/supabase-js` (already installed) and browser-native APIs. Honours the project CLAUDE.md "don't add deps without a reason" rule.
- **Dependency:** no Supabase migration. Honours the "migrations are manual" rule by having zero migrations to apply.

## Documentation / Operational Notes

- **User-facing:** the CHANGELOG 0.12.0 entry is the only net-new doc. **What's new** tells the user "when someone in your challenge completes an activity, you'll see a gentle notification". **Under the hood** notes the realtime + notification API path and the foreground-only limitation.
- **Developer-facing:** `src/lib/activityNotifications.js` JSDoc header carries the payload contract so a future Web Push plan can mirror it without re-deriving.
- **Operational:** no env vars, no secrets, no cron, no new endpoint, no Sentry rule, no PostHog event needed beyond the opt-in toggle analytics line.
- **Handoff log:** append an entry to `docs/handoff/handoff.md` on completion describing the payload contract + the Web Push deferral.

## Sources & References

- Plan: [docs/plans/2026-04-15-001-feat-user-preferences-and-progress-v2-plan.md](../plans/2026-04-15-001-feat-user-preferences-and-progress-v2-plan.md) — preferences pipeline this plan extends.
- Related code: `src/contexts/DataContext.jsx`, `src/lib/adminConfig.js`, `src/lib/habits.js`, `src/sw.template.js`, `supabase/migrations/20260412000005_leaderboard_realtime_and_cumulative.sql`.
- External docs: MDN Notification API; Supabase Realtime v2 Broadcast channels.

## Routing summary

| Unit | Runner | Rationale |
|------|--------|-----------|
| 1 Activity-flip detection + message composition | codex-delegate | Pure helpers with fixture-driven tests. |
| 2 Browser notification wrapper | codex-delegate | Thin wrapper around a browser API. |
| 3 Preference schema + toggle UI | codex-delegate | Follows the established preferences pattern. |
| 4 Broadcast sender | codex-delegate | Tight contract; test shape is the only design work. |
| 5 Subscriber wiring | codex-delegate | Headless component, lifecycle-driven. |
| 6 Smoke + CHANGELOG + bump | claude | Judgement: real browsers, real permission prompts, release metadata. |

Five of six units delegate to Codex once this plan is locked; Claude stays in the loop only for the live-browser smoke test and release metadata.
