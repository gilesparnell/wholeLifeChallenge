---
title: Custom sleep hours input + opt-in sharing of wellness insights and reflexion journal
type: feat
status: active
date: 2026-04-21
version_bump: 0.15.1 → 0.16.0 (minor — new feature, new schema, new tracked surfaces)
---

# Custom sleep hours input + opt-in sharing of wellness insights and reflexion journal

## Routing summary

| Unit | Execution target | Reason |
|---|---|---|
| 1. Sleep custom-entry affordance | `codex-delegate` | Mechanical UI + unit tests against a well-defined numeric range |
| 2. `entry_shares` table + RLS + curated views | **`claude`** | Security-sensitive schema + RLS design. Judgement required on scope model, view column selection, and policy composition. Must not get delegated. |
| 3. `sanitisePreferences` extension for share toggles | `codex-delegate` | Mechanical once the shape is defined below |
| 4. Preferences UI — share toggles + viewer picker | `codex-delegate` | Follows existing pattern in `MyPreferences.jsx`; spec is tight |
| 5. Active-users source helper (`listShareableProfiles`) | `codex-delegate` | Thin query wrapper |
| 6. Journal tab viewer (owner selector + shared-data source) | `codex-delegate` | Reuses existing Journal rendering; only the data source switches |
| 7. Progress tab viewer (owner selector + shared-data source) | `codex-delegate` | Same pattern as Unit 6 |
| 8. Version bump, CHANGELOG, manual migration note, deploy | `codex-delegate` | Mechanical |

**Claude-tagged units:** 1 (Unit 2 only). Everything else is mechanical once the schema and data-source pattern are locked.

---

## Overview

Two independent updates, bundled because they share a release cycle:

1. **Custom sleep-hours entry.** The sleep habit currently only accepts preset values `[5, 5.5, …, 10]` via a row of buttons in `SleepCard.jsx`. Users with shorter sleep nights (the trigger case: 3 hours) cannot log reality. Add a free-form numeric input that accepts any value 0–24 with 0.5 step, validated client-side and server-side against the existing CHECK constraint.

2. **Opt-in sharing of wellness insights + reflexion journal.** Today all daily-entry data is strictly self-read via RLS. Introduce granular, recipient-scoped sharing so a user can share:
   - their **reflexion journal** (the `reflect.reflection_text` field), and/or
   - their **wellness insights** (the `sleep`, `wellbeing`, `selfReport` JSONB fields — the inputs the Progress page already derives charts from)
   - with specific other active users, OR with "all active users" as a separate setting.
   
   Viewing happens inline on the existing Journal and Progress pages via an **owner selector** at the top of each page ("Viewing: Me ▾"). A sharer whose name appears in the selector has explicitly enabled that scope for the viewer.

## Problem statement / motivation

**Sleep input.** The preset-button UI was fine for the design target ("7–9 hours is good sleep") but fails on reality: last night the primary user slept 3 hours and had no way to log it. The DB already allows 0–24, so this is purely a UI affordability gap.

**Sharing.** The four-person WLC cohort wants to support each other during tough stretches — wellness dips, bad reflexion days — without making all data visible to all users by default. The existing `leaderboard_visible` boolean covers *scores only* and is binary-global. This new surface is finer-grained: per-scope (wellness vs journal) and per-recipient.

The historical privacy stance (from `docs/plans/2026-04-11-001-*.md:306`) was explicit: "reflections/nutrition detail never shared". This plan deliberately reverses that for reflections and wellness, **but only under explicit opt-in, defaulting OFF, and with per-recipient control**. Nutrition detail remains out of scope.

## Proposed solution

### Feature 1 — Sleep custom input

Keep the preset buttons (fast entry for common values; good UX; no regression). Add a **"Custom"** compact affordance to the same card:

- A small toggle or button `Custom…` that, when pressed, reveals an inline numeric input.
- Numeric input: `<input type="number" min="0" max="24" step="0.5">` with inline validation and an ✓ Save / ✕ Cancel pair.
- On save, the value flows through the same `onChange({completed: true, hours: value})` contract already used by the preset buttons — no changes to `DataContext.saveDay()` or the Supabase round-trip.
- Visual state: when a non-preset value is active, highlight a virtual chip showing `{value}h · custom` so the user can see what was logged, and so the preset buttons still reflect "no preset selected".
- Accessibility: preserve keyboard nav; Enter to save, Escape to cancel.

No schema change. The CHECK constraint on `sleep->>'hours'` (0 ≤ h ≤ 24) already validates.

### Feature 2 — Opt-in sharing (architecture)

#### Schema: new join table

```sql
CREATE TABLE public.entry_shares (
  owner_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope       text NOT NULL CHECK (scope IN ('wellness', 'journal')),
  share_all   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, viewer_id, scope)
);
```

**Semantics.**
- A row `(owner, viewer, scope)` means: `owner` has granted `viewer` read access for `scope`.
- `share_all` is **stored on every row** where `viewer_id = owner_id` (self-row) and used as a flag: "if this owner has `share_all=true` for this scope, every active user sees it". This lets RLS remain a single predicate.

Actually, after design review: `share_all` semantics are cleaner as a separate column on `profiles.preferences` (boolean per scope). Final shape:

```sql
-- 1. per-recipient rows live in entry_shares
CREATE TABLE public.entry_shares (
  owner_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewer_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope       text NOT NULL CHECK (scope IN ('wellness', 'journal')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, viewer_id, scope)
);

-- 2. "share with all active users" lives in profiles.preferences as two booleans:
--      share_wellness_all: false
--      share_journal_all:  false
--    sanitisePreferences gains typed entries for these.
```

This avoids the "self-row with share_all" hack and keeps semantics obvious: rows = individual grants, booleans = blanket override.

#### RLS + curated views

No broad-read policy on `daily_entries`. Follow the leaderboard precedent and expose two curated views:

```sql
CREATE OR REPLACE VIEW public.shared_journal_entries
WITH (security_invoker = true) AS
SELECT
  de.user_id    AS owner_id,
  de.date,
  de.reflect    -- only the reflect JSONB is exposed
FROM public.daily_entries de
WHERE
  de.user_id = auth.uid()                                    -- self is always allowed
  OR EXISTS (                                                -- explicit grant
    SELECT 1 FROM public.entry_shares s
    WHERE s.owner_id = de.user_id
      AND s.viewer_id = auth.uid()
      AND s.scope = 'journal'
  )
  OR EXISTS (                                                -- "share with all" flag
    SELECT 1 FROM public.profiles p
    WHERE p.id = de.user_id
      AND (p.preferences ->> 'share_journal_all')::boolean = true
  );

CREATE OR REPLACE VIEW public.shared_wellness_entries
WITH (security_invoker = true) AS
SELECT
  de.user_id    AS owner_id,
  de.date,
  de.sleep,
  de.wellbeing,
  de."selfReport"
FROM public.daily_entries de
WHERE
  de.user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.entry_shares s
    WHERE s.owner_id = de.user_id
      AND s.viewer_id = auth.uid()
      AND s.scope = 'wellness'
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = de.user_id
      AND (p.preferences ->> 'share_wellness_all')::boolean = true
  );

GRANT SELECT ON public.shared_journal_entries, public.shared_wellness_entries TO authenticated;
```

**Why views (not a direct RLS policy on `daily_entries`):**
- Curated views only expose the *columns* relevant to each scope. An RLS policy would grant row access, leaking all columns (nutrition, exercise) to the viewer.
- Matches the existing `public.leaderboard` pattern (cited in `supabase/migrations/20260412000004_leaderboard.sql`).
- `security_invoker = true` means RLS on the underlying table still applies for self-reads; the `OR EXISTS` predicates expand access only for shared rows.

**RLS on `entry_shares` itself:**

```sql
ALTER TABLE public.entry_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entry_shares_self_manage" ON public.entry_shares
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Viewers can SELECT rows that grant them access (so they can list "who shares with me")
CREATE POLICY "entry_shares_viewer_read" ON public.entry_shares
  FOR SELECT TO authenticated
  USING (viewer_id = auth.uid());
```

#### Preferences extension

Add to `sanitisePreferences` (`src/lib/adminConfig.js`):

```js
PREFERENCE_TYPES: {
  // existing fields…
  share_wellness_all: 'boolean',
  share_journal_all:  'boolean',
}
```

No range-checking needed — booleans coerce via `!!`.

#### UI — Preferences page (`MyPreferences.jsx`)

New section, below "Notifications", titled **"Sharing"**:

```
┌─────────────────────────────────────────────┐
│ Sharing                                      │
│ ───────────────────                          │
│                                              │
│ Share my reflection journal                  │
│ [ ] with all active users                    │
│ or with specific people:                     │
│   [✓] Alice                                  │
│   [ ] Bob                                    │
│   [✓] Carol                                  │
│                                              │
│ Share my wellness insights                   │
│ (sleep hours, wellbeing, how-you-feel)       │
│ [ ] with all active users                    │
│ or with specific people:                     │
│   [ ] Alice                                  │
│   [✓] Bob                                    │
│   [ ] Carol                                  │
└─────────────────────────────────────────────┘
```

Each per-person checkbox upserts/deletes a row in `entry_shares`. The "all" toggle flips the corresponding `preferences.share_*_all` boolean.

**Default state:** both all-toggles OFF; no `entry_shares` rows. Nothing changes for users who do nothing.

#### UI — Journal tab (owner selector)

At the top of `src/pages/Journal.jsx`, above the list:

```
┌──────────────────────────────────────────┐
│ Viewing: [Me ▾]                           │
│          ┌───────────────┐                │
│          │ Me            │                │
│          │ Alice         │                │
│          │ Carol         │                │
│          └───────────────┘                │
└──────────────────────────────────────────┘
```

Dropdown is populated with:
1. `Me` (self — always present)
2. Every owner whose `entry_shares.viewer_id = me AND scope='journal'` OR whose `share_journal_all=true` AND is an active user (has signed in).

On selection, the page swaps its data source from `useData()` (which reads `daily_entries` for self) to a new `useSharedJournal(ownerId)` hook that reads from `shared_journal_entries` view. Rendering of cards is unchanged.

#### UI — Progress (wellness insights) tab

Same pattern. Top of `src/pages/Progress.jsx`, same selector. Scope is `wellness`. Data source swaps to `useSharedWellness(ownerId)` which reads from `shared_wellness_entries` view.

**Scope of charts when viewing someone else:** only charts driven by `sleep`, `wellbeing`, `selfReport` render. Charts derived from `exercise`, `mobilize`, `nutrition`, `hydrate`, full `daily_entries` aggregates gracefully hide or render an empty-state card ("Not shared"). This keeps viewer-side filtering aligned with what the view actually exposes — if someone tried to query the full table for another user, RLS would reject it. The UI enforces this cleanly without a runtime error.

#### Active-users source

Helper `listShareableProfiles()` in `src/lib/profiles.js`:

```js
// Returns profiles of users who have signed in (exist in profiles)
// and are not the current user.
export async function listShareableProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .neq('id', currentUserId);
  // …
}
```

Used by the Preferences "specific people" checkboxes.

## Technical considerations

### Architecture impacts

- New migration file (`supabase/migrations/20260421000013_entry_shares_and_views.sql`) — manual apply per project CLAUDE.md.
- One new table, two new views, new RLS policies.
- Two new React hooks (`useSharedJournal`, `useSharedWellness`) — thin Supabase query wrappers.
- One new page-level component `OwnerSelector` shared between Journal and Progress.
- `sanitisePreferences` extended with two new typed boolean entries.

### Performance

- Views use `EXISTS` subqueries, each hitting small tables (`entry_shares` is bounded by n² for n users — 16 rows for a 4-user cohort). Negligible.
- Read path: viewer queries view → planner inlines the `EXISTS` → executes against `daily_entries`. One extra predicate per query.
- No new indexes needed at current scale (4 users × ~300 days = 1200 rows max). Add `entry_shares(viewer_id, scope)` index if users grow past ~20 or queries get chatty.

### Security

- RLS remains default-deny on `daily_entries`. Views add no column leakage because they explicitly `SELECT` only the allowed JSONB fields.
- `entry_shares` RLS prevents a user from inserting a share on someone else's behalf (`WITH CHECK (owner_id = auth.uid())`).
- Viewer can read `entry_shares` rows where they are the viewer (so they can see "who shares with me"), but cannot modify.
- `share_*_all` booleans live on `profiles.preferences` — already self-write-only.

### Privacy semantics

- No retroactive consent shift: everything opt-in, defaults OFF.
- Revoking a share (delete row or flip boolean) is immediate: next viewer query returns no rows.
- Reflections historically private — this is a deliberate loosening. CHANGELOG entry must call this out in the "What's new" section so users reviewing the release understand the new surface area.

## System-wide impact

### Interaction graph
- `MyPreferences.jsx` save → upsert `profiles.preferences` (existing path) + CRUD `entry_shares` (new path).
- `Journal.jsx` owner selector changes → `useSharedJournal(ownerId)` fires → reads `shared_journal_entries` view.
- `Progress.jsx` owner selector changes → `useSharedWellness(ownerId)` fires → reads `shared_wellness_entries` view.
- Existing `DataContext` is untouched — self-view still uses it.

### Error propagation
- View query failure (e.g. network) surfaces via existing error-state rendering in Journal/Progress pages.
- Malformed `entry_shares` INSERT rejected by RLS → Supabase client returns error → Preferences page shows inline error toast.
- Unknown `ownerId` in the owner selector (e.g. stale after a deletion) → view returns zero rows → empty-state renders.

### State lifecycle risks
- User A deletes their account → `profiles` cascade deletes → `entry_shares` cascade deletes via FK → views stop returning A's rows. No orphaning.
- User B is un-whitelisted while A shares with them → A can still revoke but B won't re-query (B is no longer authenticated).
- Race: A toggles share off mid-query from B → B's in-flight query completes; next refresh shows empty. Acceptable — no stale cache invalidation needed at this scale.

### API surface parity
- Only new surfaces: two views + one table. No existing APIs change signature.

### Integration test scenarios
1. A enables journal share for B only → B's Journal selector shows A → B views A's reflections → C's selector does NOT list A. Verify in DB + UI.
2. A enables `share_journal_all=true` → every active user's Journal selector includes A.
3. A shares wellness with B, not journal → B sees A in Progress selector but not Journal selector.
4. A revokes share → B's next Journal query returns no rows.
5. Sleep custom input: enter 3 → saves successfully, renders "3 hours"; enter 25 → client rejects with validation message, no DB roundtrip; enter 0 → saves (CHECK allows 0).

## Acceptance criteria

### Functional
- [ ] Sleep card shows a "Custom…" affordance beside the preset buttons
- [ ] Custom input accepts 0–24 step 0.5, validates inline, saves via the existing `onChange` contract
- [ ] DB CHECK constraint rejects out-of-range values (existing behaviour; verified with a failing test)
- [ ] `entry_shares` table created with idempotent migration
- [ ] RLS policies on `entry_shares` enforce self-management and viewer-read
- [ ] `shared_journal_entries` and `shared_wellness_entries` views grant correct column subsets with correct predicate
- [ ] `profiles.preferences` typed to include `share_wellness_all` and `share_journal_all` booleans
- [ ] `MyPreferences` page has a "Sharing" section with per-scope all-toggles + per-recipient checkboxes
- [ ] Checkbox toggle upserts/deletes rows in `entry_shares`
- [ ] All-toggle flips `preferences.share_*_all`
- [ ] Journal page shows an owner selector populated by sharers + self
- [ ] Progress page shows an owner selector populated by sharers + self
- [ ] Viewing another user's journal renders their reflections using the existing card style (reuse, no duplication)
- [ ] Viewing another user's wellness renders only the `sleep`, `wellbeing`, `selfReport`-derived charts; others render an empty-state card
- [ ] Version bumped from 0.15.1 to 0.16.0 in `package.json`
- [ ] CHANGELOG.md has a new `[0.16.0]` entry with both "What's new" and "Under the hood" sections, and the privacy loosening is explicitly called out in "What's new"

### Non-functional
- [ ] `npx vitest run` passes, including new tests for the sleep custom input component and the sanitisePreferences boolean coercion
- [ ] Lint clean (`npm run lint` or project equivalent)
- [ ] No new npm dependencies (challenge per project CLAUDE.md — everything here is hand-rolled against existing React + Supabase primitives)
- [ ] Migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE VIEW`, `DROP POLICY IF EXISTS` + `CREATE POLICY`)
- [ ] Post-apply verification query documented in the migration file comment block

### Quality gates
- [ ] PR description lists the manual migration steps (Supabase Dashboard → SQL Editor → paste → Run → verify)
- [ ] Post-merge: migration applied to prod Supabase, verified with `SELECT table_name FROM information_schema.tables WHERE table_name IN ('entry_shares')` + `SELECT viewname FROM pg_views WHERE viewname LIKE 'shared_%'`
- [ ] Deploy to Vercel confirmed green
- [ ] `/health` page shows `v0.16.0 (sha7)` post-deploy

## Implementation phases

### Phase 1 — Sleep custom-entry affordance (Unit 1)
**Execution target:** `codex-delegate`

Files:
- `src/components/habits/SleepCard.jsx` — add Custom… affordance + inline numeric input + ✓/✕ controls
- `src/components/habits/__tests__/SleepCard.test.jsx` (or co-located) — unit tests for: preset click, custom click, custom save valid, custom save out-of-range rejected, Escape cancels, Enter saves

Tests written **before** implementation (tdd-first). Confirmed failing first, then make green.

Verification: `npx vitest run src/components/habits/SleepCard` green. Manual: in dev server, enter 3, save, confirm log shows "3 hours".

### Phase 2 — Schema + RLS + curated views (Unit 2)
**Execution target:** `claude`

File: `supabase/migrations/20260421000013_entry_shares_and_views.sql`

Contents (skeleton in the "Proposed solution" section above). Key invariants while writing:
- Idempotent throughout
- `DROP POLICY IF EXISTS` before every `CREATE POLICY`
- `CREATE OR REPLACE VIEW` for views
- `CREATE TABLE IF NOT EXISTS` for the table
- Trailing verification queries as SQL comments for copy-paste after apply

Verification (manual, post-apply in Supabase):
```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
  WHERE conrelid = 'public.entry_shares'::regclass;
SELECT policyname FROM pg_policies WHERE tablename = 'entry_shares';
SELECT viewname FROM pg_views WHERE viewname LIKE 'shared_%';
```

### Phase 3 — Preferences boolean extension (Unit 3)
**Execution target:** `codex-delegate`

Files:
- `src/lib/adminConfig.js` — add `share_wellness_all` and `share_journal_all` to `PREFERENCE_TYPES` (both `'boolean'`)
- `src/lib/__tests__/adminConfig.test.js` — test that `sanitisePreferences` retains both `true` and `false` for these new fields, coerces non-booleans

Verification: vitest suite passes including new cases.

### Phase 4 — Preferences "Sharing" UI (Unit 4)
**Execution target:** `codex-delegate`

Files:
- `src/pages/MyPreferences.jsx` — new "Sharing" section
- `src/lib/shareRepo.js` (new) — thin wrapper with `listShares(ownerId)`, `addShare(viewerId, scope)`, `removeShare(viewerId, scope)`
- `src/lib/profiles.js` — new `listShareableProfiles()` helper
- Tests: `src/lib/__tests__/shareRepo.test.js` with mocked supabase client

Verification: vitest green; manual: toggle per-person checkbox, check DB row appears, toggle off, row disappears; toggle all-switch, preferences.share_*_all flips.

### Phase 5 — Owner selector component (Unit 5 pre-req)
**Execution target:** `codex-delegate`

Files:
- `src/components/OwnerSelector.jsx` — dropdown: takes `scope`, fetches sharers via view (`SELECT DISTINCT owner_id FROM shared_{scope}_entries`), returns `{ownerId, ownerName}` on change
- Tests

### Phase 6 — Journal tab viewer (Unit 6)
**Execution target:** `codex-delegate`

Files:
- `src/pages/Journal.jsx` — mount `OwnerSelector scope="journal"` at top; swap data source
- `src/hooks/useSharedJournal.js` (new) — queries `shared_journal_entries` view, returns `{[dateStr]: {reflect}}` shape matching DataContext output
- Tests: hook test + integration render test

Verification: with two seeded share rows (A → B, A → C not granted), B sees A in selector and can view entries; C does not see A.

### Phase 7 — Progress/wellness tab viewer (Unit 7)
**Execution target:** `codex-delegate`

Files:
- `src/pages/Progress.jsx` — mount `OwnerSelector scope="wellness"`; swap data source
- `src/hooks/useSharedWellness.js` (new)
- Gracefully hide / render "Not shared" for charts whose input fields are not exposed by `shared_wellness_entries`

Verification: viewer seeing a sharer's wellness sees only sleep/wellbeing/selfReport-derived charts; exercise/nutrition charts show empty state.

### Phase 8 — Version bump + CHANGELOG + deploy (Unit 8)
**Execution target:** `codex-delegate`

1. `package.json`: `0.15.1` → `0.16.0`
2. `CHANGELOG.md`: new entry `[0.16.0] — 2026-04-21` with:
   - **What's new** bullets (customer language):
     - "Log any sleep duration — if last night was rough (or amazing), type the exact number. Previously capped at 5–10 hours."
     - "Optional sharing: opt in to show your reflection journal and wellness insights to specific people you trust in the cohort."
     - "Pick exactly who you share with — no 'all or nothing'. A separate 'everyone' toggle is there if you want it."
     - "View a friend's journal or wellness insights directly inside the existing tabs via a 'Viewing:' selector at the top."
     - "Privacy note: previously reflections were always private. They remain private by default — sharing is opt-in only."
   - **Under the hood** bullets (dev language):
     - Custom numeric input in `SleepCard.jsx` with tdd coverage
     - New `entry_shares` table + `shared_journal_entries` / `shared_wellness_entries` views in migration `20260421000013`
     - RLS policies matching the `leaderboard`/curated-view precedent from migration 20260412000004
     - `sanitisePreferences` extended with `share_{wellness,journal}_all` booleans
     - `useSharedJournal` / `useSharedWellness` hooks, `OwnerSelector` shared component
3. Commit, push, PR, branch-protection-green, squash-merge, deploy via Vercel, apply migration manually, confirm `/health` shows `v0.16.0 (sha7)`.

## Alternative approaches considered

| Option | Why rejected |
|---|---|
| Extend sleep preset buttons to `[0, 0.5, …, 12]` | 25 buttons is UI bloat; custom input is fewer pixels and covers the full legal range |
| Replace preset buttons with a native `<input type="range">` slider | Breaks established preset-tap muscle memory; worse for quick-log of common values |
| Model sharing as a JSONB array on `profiles.preferences` instead of a join table | Existing convention is a table when relationships are between entities; JSONB array makes revoke-by-index fragile and RLS filters awkward. Join table matches `allowed_emails` precedent (separate entity per row). |
| Policy on `daily_entries` instead of curated views | Policy would grant row access, leaking `exercise`/`nutrition`/`hydrate` columns that are out of scope for this share. Views enforce column-level scoping. |
| New top-level "Wellness Insights" tab separate from Progress | Progress IS the wellness insights page. Duplicating would confuse users and split chart logic. Adding a selector to Progress is the cheaper + more discoverable fix. |
| Separate "Shared with me" tab | Viewer has to context-switch away from the feature they already use. Inline selector keeps flow intact. |

## Dependencies & risks

- **Supabase migration must be applied manually** after merge (per project CLAUDE.md). If skipped, the app will deploy with UI referencing views that don't exist → runtime errors in Preferences save, Journal/Progress selectors. Mitigation: PR description calls out the migration step explicitly; post-deploy smoke check on `/health` + a manual "view Me in selector" test.
- **Privacy loosening is permanent-feeling.** Once a user shares their journal with another user, that user sees entries going back to the start of the challenge. Mitigation: call this out in the "What's new" bullet so users understand scope before they flip the toggle. No retention-window feature in this plan (YAGNI — ask if a user requests it).
- **Active users list may include users who haven't signed in for months.** Acceptable at 4-user cohort scale. If the cohort grows, add a "last active" filter.

## Success metrics

- Deployment goes out on version `0.16.0` with green CI.
- Migration applies without errors; verification query returns expected policies, table, views.
- Primary user (reporter) successfully logs a 3-hour sleep night.
- At least one opt-in share is configured end-to-end (demonstrated in manual test).
- No runtime errors in Sentry/console for Journal + Progress + Preferences pages in first 24 hours.

## Sources & references

### Internal

- `src/components/habits/SleepCard.jsx:47-61` — current preset buttons
- `src/pages/Journal.jsx:1-129` — journal rendering pattern to reuse
- `src/pages/Progress.jsx` — wellness insights page (owner selector mounts here)
- `src/pages/MyPreferences.jsx:388-461` — existing preferences UI pattern
- `src/lib/adminConfig.js` — `PREFERENCE_TYPES`, `sanitisePreferences`, `getEffectiveConfig`
- `src/contexts/AuthContext.jsx` — `useAuth()` + `profile` shape
- `supabase/migrations/20260412000001_profiles_and_allowed_emails.sql:75-108` — RLS policy template
- `supabase/migrations/20260412000004_leaderboard.sql` — curated-view + opt-in-boolean precedent
- `supabase/migrations/20260413000010_daily_entries_check_constraints.sql:49-52` — sleep hours 0–24 CHECK
- `supabase/migrations/20260415000011_add_preferences_to_profiles.sql` — `profiles.preferences` JSONB
- `CHANGELOG.md` — last entry `[0.15.0 → 0.15.1] — 19 Apr 2026`
- `package.json:version` — `0.15.1` (bump target `0.16.0`)

### Project conventions

- `/Users/gilesparnell/Documents/VSStudio/personal/wholeLifeChallenge/CLAUDE.md` — versioning, migrations are manual, tests must pass, no unnecessary deps
- `/Users/gilesparnell/.claude/CLAUDE.md` — runner routing, CHANGELOG split, Shipping Discipline, Plan Execution Continuity

### Prior art learnings surfaced by research

- Leaderboard: boolean flag on `profiles` + curated view + `GRANT SELECT TO authenticated` is the canonical opt-in share pattern in this repo
- Reflections have historically been private — this plan knowingly loosens that under explicit opt-in
- `PREFERENCE_TYPES` treats booleans as "persist both true and false" (vs numbers which only persist overrides)
