---
title: "feat: WLC production hardening"
type: feat
status: active
date: 2026-04-12
last_updated: 2026-04-13
---

# feat: WLC production hardening

## Tier A — in review (2026-04-13 afternoon)

After the overnight session was paused for rethink, the salvageable work was split into 4 small reviewable PRs against `master`. Each is a self-contained slice with passing tests and a focused diff.

| PR | Branch | Item(s) | Tests |
|----|---|---|---|
| [#8](https://github.com/gilesparnell/wholeLifeChallenge/pull/8)  | `chore/ci-and-lint-cleanup` | #9 CI workflow + lint cleanup | 366/366 |
| [#9](https://github.com/gilesparnell/wholeLifeChallenge/pull/9)  | `a11y/wcag-contrast`        | #7 + #8 WCAG AA contrast + Lighthouse fixes | 366/366 |
| [#10](https://github.com/gilesparnell/wholeLifeChallenge/pull/10) | `feat/404-not-found-page`   | #20 404 NotFound page | 369/369 |
| [#11](https://github.com/gilesparnell/wholeLifeChallenge/pull/11) | `feat/health-endpoint`      | #21 /health endpoint  | 369/369 |

**Merge order:** #8 first (so subsequent PRs get CI). #10 and #11 conflict on `src/App.jsx` (both add a `<Route>`) — whichever lands first, the other rebases.

The original `feat/phase2-3-overnight` branch is now superseded and can be deleted once all 4 PRs are merged.

### Tier B — your-action items (parallel to Tier A review)

These don't need a Claude session and can be done while the PRs are reviewed:
- **#11 branch protection on master** — GitHub Settings → Branches → require PR + CI checks (do this *after* PR #8 lands so the check name exists)
- **#10 PostHog signup** — create account, paste API key back here for wiring
- **#27 Supabase quota alarms** — Supabase dashboard → Project Settings → Billing → Usage Alerts

---

## Overview

The Whole Life Challenge tracker is feature-complete (Phases 1–4 shipped) but operationally fragile. This plan systematically hardens the app for production use by external users — error tracking, backups, observability, accessibility, security, and resilience. 27 items grouped into three priority tiers, executed in order.

## Current Status (updated 2026-04-13)

- **App is live** at https://wholelifechallenge.parnellsystems.com/
- **Stack**: Vite 8 + React 19 + Supabase (auth + Postgres) + Recharts, deployed to Vercel from `gilesparnell/wholeLifeChallenge` on GitHub
- **351 unit/integration tests passing** across 26 test files
- **Database schema**: 8 Supabase migrations applied (profiles, allowed_emails, RLS, leaderboard RPC, onboarding flag, RLS security fixes, cascade delete trigger)
- **Real users on the app**: 4 whitelisted, 4 profiles (Giles x2, Jackie, Barnaby)
- **CI**: none configured yet — **NEXT Phase 2 item (#9)**
- **Docs site**: `docs/index.html` exists with working Launch App link; `user-guide.html` still stub
- **Error tracking**: ✅ **Sentry wired up** (Phase 1, verified receiving prod events). Known-benign errors filtered via `ignoreErrors` to protect the 5K/month free quota.
- **Backups**: ✅ **Daily GitHub Action at 03:00 UTC** (Phase 1, workflow file on master, manual despatch also works). Artefacts retained 30 days.
- **Analytics**: none — **Phase 2 item (#10)**

## Phase 1 completion (2026-04-12)

All 6 P0 items merged to master via PR #2 and PR #3. Production deployed automatically by Vercel on each merge. Changes shipped:

- React ErrorBoundary with two layers (app-wide + per-route), 8 unit tests, Sentry `onError` hook
- `@sentry/react` initialised in `main.jsx`, with `ignoreErrors` filter for the Supabase auth-lock noise, ResizeObserver loops, and generic network failures. Browser tracing + session replay integrations active. 11 unit tests for `src/lib/sentry.js`
- `.github/workflows/supabase-backup.yml` — daily cron at 03:00 UTC, manual despatch, 2 artefacts per run (data-only + schema-only SQL), retention 30 days. First run verified end-to-end with real production data downloaded.
- Supabase Security Advisor: 0 errors, 0 applicable warnings (only `auth_leaked_password_protection` remains — not applicable to our OAuth-only auth). Fixed via migration 007:
  - Leaderboard view converted to `get_leaderboard()` SECURITY DEFINER RPC function with explicit column whitelist and anon role explicitly revoked
  - `search_path` pinned on `touch_updated_at`, `is_admin`, `handle_new_user` functions
- Migration 008 added `cascade_delete_daily_entries()` trigger — deleting a profile now purges the user's daily_entries automatically. Verified live against the database via transaction+rollback.
- README rewritten from the Vite default to a proper project overview — what the app does, stack, local dev setup, commands, deployment, admin tasks, architecture quick tour.

## Carry-over items discovered during Phase 1

- **`handle_new_user` trigger review** — this auto-creates a profile row on every `auth.users` insert, BEFORE the client's whitelist check runs. Non-whitelisted Google accounts create a short-lived profile row that the client then signs out. Minor footprint but worth reviewing.
- **32 pre-existing lint errors** — mostly in the legacy `whole-life-challenge.jsx` root-level file (unused vars, empty blocks), plus a few in `src/pages/CheckIn.jsx`, `src/pages/Progress.jsx`, `src/pages/Leaderboard.jsx`. Must be fixed before Phase 2 item #9 (CI) can go green.

## Items Summary

| # | Tier | Item | Effort | Status |
|---|------|------|--------|--------|
| 1 | **P0** | React Error Boundary | S | ✅ DONE (2026-04-12) |
| 2 | **P0** | Sentry error tracking | S | ✅ DONE (2026-04-12) |
| 3 | **P0** | Daily Supabase backup automation | M | ✅ DONE (2026-04-12) |
| 4 | **P0** | RLS security audit | S | ✅ DONE (2026-04-12) |
| 5 | **P0** | Updated README | S | ✅ DONE (2026-04-12) |
| 6 | **P0** | User-deletion cascade test | S | ✅ DONE (2026-04-12) |
| 7 | **P1** | Lighthouse audit on production | M | 🔵 PR [#9](https://github.com/gilesparnell/wholeLifeChallenge/pull/9) (in review) |
| 8 | **P1** | WCAG AA contrast verification | S | 🔵 PR [#9](https://github.com/gilesparnell/wholeLifeChallenge/pull/9) (in review) |
| 9 | **P1** | CI on PRs (GitHub Actions) | S | 🔵 PR [#8](https://github.com/gilesparnell/wholeLifeChallenge/pull/8) (in review) |
| 10 | **P1** | Analytics tool (PostHog/Plausible) | S | 📋 (needs PostHog signup) |
| 11 | **P1** | Branch protection on main | XS | 📋 (your action — after #8 merges) |
| 12 | **P1** | Vercel preview deployments | XS | ✅ DONE (2026-04-12) |
| 13 | **P2** | PWA + offline support | L | 📋 |
| 14 | **P2** | Zod runtime validation | M | 📋 |
| 15 | **P2** | Bundle audit (Recharts replacement?) | M | 📋 |
| 16 | **P2** | TypeScript progressive migration (lib/) | L | 📋 |
| 17 | **P2** | CHECK constraints on daily_entries | S | 📋 |
| 18 | **P2** | Auth expiry / TOKEN_REFRESHED handling | S | 📋 |
| 19 | **P2** | Network retry queue + saving indicator | M | 📋 |
| 20 | **P2** | 404 NotFound page | XS | 🔵 PR [#10](https://github.com/gilesparnell/wholeLifeChallenge/pull/10) (in review) |
| 21 | **P2** | /health endpoint | S | 🔵 PR [#11](https://github.com/gilesparnell/wholeLifeChallenge/pull/11) (in review) |
| 22 | **P2** | Project docs site fleshed out | M | 📋 |
| 23 | **P2** | Operational runbook | S | 📋 |
| 24 | **P2** | GDPR data export button | S | 📋 |
| 25 | **P2** | Privacy policy page | S | 📋 |
| 26 | **P2** | Cookie / storage notice | XS | 📋 |
| 27 | **P2** | Supabase quota alarms | XS | 📋 (your action) |

Effort: XS = <30 min, S = 1–2 h, M = half day, L = 1+ day

---

## Phase 1 — Critical Hard Requirements (Week 1)

These are the minimum to feel comfortable handing the URL to a friend. Tackle in order — each unblocks the next.

### 1.1 React Error Boundary (P0, S)

**Problem:** If any component throws (a chart fails to render, a missing data field, an unhandled async edge case), the entire app whitescreens. The user has no recovery path beyond a hard refresh, and you have no record of what happened.

**Approach:**
- Create `src/components/ErrorBoundary.jsx` — class component with `componentDidCatch` and `getDerivedStateFromError`
- Render fallback UI: "Something went wrong" + error message (truncated) + "Reload" button + "Go home" link
- Wrap routes in App.jsx: `<ErrorBoundary><Routes>...</Routes></ErrorBoundary>`
- Optionally wrap individual pages too so a Progress crash doesn't kill the whole shell
- When Sentry is wired (item #2), report exceptions from `componentDidCatch`

**Files affected:**
- `src/components/ErrorBoundary.jsx` (new)
- `src/components/ErrorBoundary.test.jsx` (new)
- `src/App.jsx`

**Acceptance criteria:**
- [ ] ErrorBoundary catches a deliberate `throw` in a child component and renders fallback UI
- [ ] Reload button reloads the page
- [ ] Test: render `<ErrorBoundary><Bomb /></ErrorBoundary>` where `Bomb` throws → fallback shown, no whitescreen
- [ ] Wired into App.jsx wrapping `<Routes>`

### 1.2 Sentry error tracking (P0, S)

**Problem:** Right now, if a user hits a runtime error (in production), nobody finds out. No stack traces, no breadcrumbs, no idea how often it happens.

**Approach:**
- Install `@sentry/react`
- Initialise in `src/main.jsx` with `dsn` from `VITE_SENTRY_DSN` env var (set in Vercel + .env)
- Use the official `Sentry.ErrorBoundary` (or wire ours via `Sentry.captureException`)
- Add browser tracing for performance + replays at low sample rate (10%)
- Set `release` to git SHA (read from Vercel env var `VERCEL_GIT_COMMIT_SHA`)
- Add a global `window.addEventListener('unhandledrejection', ...)` to capture promise rejections
- Free tier: 5K errors/month, 10K spans/month — sufficient for current scale

**Files affected:**
- `package.json` (add @sentry/react)
- `src/main.jsx`
- `src/components/ErrorBoundary.jsx` (call `Sentry.captureException` from `componentDidCatch`)
- `.env.example` (document VITE_SENTRY_DSN)
- Vercel env vars (set VITE_SENTRY_DSN in dashboard)

**Acceptance criteria:**
- [ ] `@sentry/react` initialised in main.jsx
- [ ] A deliberate `throw new Error('test')` from a button click appears in the Sentry dashboard within 60 seconds
- [ ] Source maps uploaded so the stack trace is readable (Vercel integration handles this automatically)
- [ ] Sentry release tag matches the git SHA on production

### 1.3 Daily Supabase backup automation (P0, M)

**Problem:** No backups. If a migration goes wrong, an admin accidentally deletes a row, or Supabase loses the project, all user data is gone. Free tier doesn't include automatic backups.

**Approach:**
- Create a GitHub Action workflow `.github/workflows/supabase-backup.yml`
- Runs daily at 03:00 UTC via cron schedule
- Steps:
  1. Install Supabase CLI
  2. Authenticate via `SUPABASE_ACCESS_TOKEN` secret
  3. Link to project
  4. Run `supabase db dump --schema public --data-only > backup.sql`
  5. Upload as a workflow artefact (retained 30 days) — OR push to a private S3-compatible bucket (Cloudflare R2 free tier)
- Manual trigger via `workflow_dispatch` for ad-hoc backups
- Document the restore procedure in the runbook (item #23)

**Files affected:**
- `.github/workflows/supabase-backup.yml` (new)
- GitHub repo secret: `SUPABASE_ACCESS_TOKEN`
- GitHub repo secret: `SUPABASE_DB_PASSWORD`
- `supabase/README.md` (add restore section)

**Acceptance criteria:**
- [ ] Workflow runs successfully on its first cron tick
- [ ] Manual `workflow_dispatch` trigger produces a downloadable `backup.sql` artefact
- [ ] Backup file contains DDL + DATA for all public schema tables
- [ ] Restore procedure documented and dry-run tested at least once

### 1.4 RLS security audit (P0, S)

**Problem:** I wrote the RLS policies but they haven't been independently verified. A misconfigured policy could expose user data to anonymous users or let any authenticated user read another user's reflections.

**Approach:**
- Open Supabase Dashboard → Database → **Advisors** → **Security Advisor**
- Run all checks (RLS not enabled, public exposure, function search_path, etc.)
- Document any findings in `docs/solutions/2026-04-12-rls-audit.md`
- Fix anything `error` or `warn` level via a new migration
- Manual cross-check: as an unauthenticated client, attempt:
  - `SELECT * FROM profiles` → should return 0 rows
  - `SELECT * FROM allowed_emails` → should return 0 rows
  - `INSERT INTO daily_entries ...` → should fail
- As an authenticated non-admin client (test user), attempt:
  - `SELECT * FROM profiles` → should return only own row
  - `UPDATE profiles SET role = 'admin'` → should fail (own row update OK but role escalation should be blocked — verify)

**Files affected:**
- `docs/solutions/2026-04-12-rls-audit.md` (new — findings + remediations)
- New migration if any policy needs fixing
- Possibly `supabase/migrations/20260412000007_rls_hardening.sql`

**Acceptance criteria:**
- [ ] Supabase Security Advisor returns zero `error` and zero `warn` items (or each is documented as accepted with rationale)
- [ ] Manual penetration tests above all behave as expected
- [ ] Rationale documented in solutions doc
- [ ] Critical fix: a non-admin user cannot escalate themselves to admin via direct SQL

### 1.5 Updated README (P0, S)

**Problem:** The repo has the default Vite README. A new contributor (or future-you) has no orientation: what is this app, how do I run it, where does it deploy, what's the schema?

**Approach:**
- Replace `README.md` with a project overview that includes:
  - One-paragraph "what is this"
  - Live URL
  - Tech stack
  - Local dev quickstart (`npm install`, `npm run dev`, env vars)
  - Test/build commands
  - Supabase setup (link CLI, apply migrations)
  - Deployment (Vercel auto-deploy from main, manual fallback)
  - Architecture overview (Auth flow, data layer, key directories)
  - Link to the docs site (item #22)
  - Link to the runbook (item #23)
- Keep it concise — under 200 lines

**Files affected:**
- `README.md`

**Acceptance criteria:**
- [ ] README opens with what the app is in <50 words
- [ ] A reader can run the app locally in <5 minutes following the README
- [ ] Includes link to live URL, supabase dashboard, vercel dashboard
- [ ] Includes commands for running tests, applying migrations, deploying

### 1.6 User-deletion cascade test (P0, S)

**Problem:** When an admin deletes a user via the Admin UI, the `profiles` row goes via `deleteProfile()`, but does that cascade to `daily_entries`? And does the `auth.users` row also get cleaned up? If not, deleted users leave orphan data behind, and re-signups with the same email could resurrect old data.

**Approach:**
- Write an integration-style test (or a SQL script + manual run) that:
  1. Creates a test profile + daily_entry rows + journal entries
  2. Calls `deleteProfile(id)`
  3. Asserts the profile row is gone
  4. Asserts the daily_entries rows are also gone (FK cascade)
  5. Asserts auth.users row is or isn't gone (depending on intent)
- If cascade is broken, write a migration adding `ON DELETE CASCADE` to the relevant FKs
- Note: Supabase auth user deletion needs `service_role` key — admin UI should use `supabase.auth.admin.deleteUser()` if we want a true clean delete

**Files affected:**
- `src/lib/profiles.test.js` (new test) — but this is integration so may need a separate `__tests__/integration/` folder
- Possibly `supabase/migrations/20260412000008_cascade_deletes.sql`
- Possibly `src/lib/profiles.js` (use admin API for full deletion)

**Acceptance criteria:**
- [ ] Documented expected behaviour (does deleting a profile delete their data, or just deactivate them?)
- [ ] Test reproduces and asserts that behaviour against the real (or test) Supabase
- [ ] If FK cascade is missing, migration added and applied
- [ ] Admin UI's "Delete user" produces no orphan rows in any table

---

## Phase 2 — Polish & Observability (Week 2)

After P0 lands, focus shifts to quality and feedback loops.

### 2.1 Lighthouse audit on production (P1, M)

**Problem:** Bundle is 230KB initial, 378KB Progress chunk lazy-loaded — looks good but no end-to-end performance score. Accessibility, best practices, SEO unknown.

**Approach:**
- Run Lighthouse on https://wholelifechallenge.parnellsystems.com/ (Chrome DevTools → Lighthouse tab → Generate report)
- Run for both desktop and mobile
- Capture baseline scores in `docs/solutions/2026-04-12-lighthouse-baseline.md`
- For each red/amber item:
  - Document the issue
  - Decide fix vs accept-and-document
- Common quick wins to expect:
  - Missing `<meta name="description">`
  - Missing `<title>` per route (react-helmet-async or react-router meta)
  - Image dimensions for the Google logo SVG (already inline so may be fine)
  - Render-blocking fonts (preload Crimson Pro / DM Sans)
  - LCP optimisation
- Re-run after fixes to confirm green

**Files affected:**
- `docs/solutions/2026-04-12-lighthouse-baseline.md` (new)
- `index.html` (meta tags, font preload)
- Possibly route components (per-page titles)
- Possibly `src/main.jsx` (any perf hints)

**Acceptance criteria:**
- [ ] Performance ≥90 on mobile, ≥95 on desktop
- [ ] Accessibility ≥95
- [ ] Best practices ≥95
- [ ] SEO ≥95
- [ ] Baseline report saved in solutions/

### 2.2 WCAG AA contrast verification (P1, S)

**Problem:** I picked the warm light palette (`#f5f3ef` bg, `#1a1a1a` text) by feel, not by checking the contrast ratio. A few colours are likely below the 4.5:1 ratio required for AA compliance — especially the muted text colours and the orange accent on coloured backgrounds.

**Approach:**
- Use a contrast checker like https://webaim.org/resources/contrastchecker/ or Chrome DevTools → Inspect → "Accessibility" panel
- Test every text/background combo defined in `src/index.css`:
  - text on bg, textMuted on bg, textDim on bg, textFaint on bg
  - text on surface, accent on surface (warning labels)
  - white text on accent button
  - all the same combinations in dark theme
- Document findings in `docs/solutions/2026-04-12-wcag-contrast.md`
- Adjust `--color-text-faint` and `--color-text-ghost` in light theme if they fall below 3:1 (they're decorative — AAA requires 4.5, but 3:1 is the absolute floor)
- For label-on-background combos (e.g., orange "Streak" label on white card), ensure ≥4.5:1

**Files affected:**
- `src/index.css`
- `docs/solutions/2026-04-12-wcag-contrast.md` (new)

**Acceptance criteria:**
- [ ] Every primary text/background combo passes WCAG AA (4.5:1 for normal text, 3:1 for large text ≥18pt)
- [ ] Every interactive element (buttons, toggles) passes 3:1 against its background
- [ ] Both themes verified
- [ ] Updated colours documented with old/new ratios

### 2.3 CI on PRs (GitHub Actions) (P1, S)

**Problem:** Nothing prevents a broken commit from reaching `main`. We rely on me running `npx vitest run` locally before commit. Any human can push direct.

**Approach:**
- Create `.github/workflows/ci.yml`
- Triggers: `pull_request` to main, `push` to any branch
- Steps:
  1. Checkout
  2. Setup Node 22 (match Vercel)
  3. Cache npm
  4. `npm ci`
  5. `npm run lint`
  6. `npm test`
  7. `npm run build`
- Set status check to "required" via branch protection (item #11)
- No deployment from CI — Vercel handles that

**Files affected:**
- `.github/workflows/ci.yml` (new)

**Acceptance criteria:**
- [ ] CI runs on every push to any branch
- [ ] Workflow passes on the current `master`
- [ ] A deliberate broken-test commit on a branch produces a red CI status
- [ ] Workflow time <3 minutes

### 2.4 Analytics tool (PostHog/Plausible) (P1, S)

**Problem:** No visibility into which features are used. Are people opting into the leaderboard? Are bonuses ever activated? Does anyone visit /info?

**Approach:**
- Pick **PostHog** (recommended): generous free tier (1M events/month), self-host option, product analytics + session replay + feature flags in one tool
- Alternative: **Plausible** for simpler privacy-first page-view-only tracking
- Install `posthog-js`
- Initialise in `src/main.jsx` with key from `VITE_POSTHOG_KEY` env var
- Track key events:
  - `signed_in` (provider: google | dev)
  - `check_in_saved` (date)
  - `bonus_auto_applied` (type)
  - `free_day_activated`
  - `leaderboard_opt_in` (true/false)
  - `onboarding_completed`
  - `onboarding_skipped` (at step N)
- Identify users by their Supabase user ID (anonymise email)
- Add an opt-out via /settings page (deferred, but design now)

**Files affected:**
- `package.json` (posthog-js)
- `src/main.jsx`
- `.env.example` (VITE_POSTHOG_KEY)
- `src/contexts/AuthContext.jsx` (identify on sign-in, reset on sign-out)
- `src/pages/CheckIn.jsx` (track save events)
- `src/pages/Leaderboard.jsx` (track opt-in)
- `src/components/OnboardingGate.jsx` (track completion/skip)
- Vercel env: VITE_POSTHOG_KEY

**Acceptance criteria:**
- [ ] PostHog dashboard shows live events from production within 5 minutes of deployment
- [ ] At least 6 distinct event types instrumented
- [ ] Users identified by Supabase user ID
- [ ] PII (emails, reflexion text, etc.) NEVER sent to PostHog
- [ ] Cookie/storage notice (item #26) discloses analytics

### 2.5 Branch protection on main (P1, XS)

**Problem:** Anyone with push access can push directly to `main`, bypassing CI. Currently only me, but it's a footgun.

**Approach:**
- GitHub repo Settings → Branches → Add protection rule for `master` (or rename to `main` first if desired)
- Require:
  - Pull request before merging (1 approval) — solo dev: self-approve allowed
  - Status checks must pass (the CI workflow from item #9)
  - Branch must be up to date before merging
  - Linear history (optional, recommended)
- Allow force pushes: NO
- Allow deletions: NO

**Files affected:**
- GitHub repo settings (no code change)

**Acceptance criteria:**
- [ ] `git push origin master` from a clean checkout fails with "protected branch" error
- [ ] PRs cannot merge until CI is green
- [ ] At least one PR has been merged via the new flow to validate

### 2.6 Vercel preview deployments (P1, XS)

**Problem:** Right now I deploy via `vercel --prod` from the CLI. There's no per-branch preview to test changes before they hit production.

**Approach:**
- Vercel → Project Settings → Git → Confirm GitHub integration is connected to `gilesparnell/wholeLifeChallenge`
- Set production branch: `master` (or `main`)
- Preview deployments: enabled for all other branches
- Test by pushing a branch and checking Vercel produces a unique preview URL
- Add the preview URL as a comment on the PR (Vercel does this automatically when wired up)

**Files affected:**
- Vercel dashboard settings (no code change)
- Possibly `.vercelignore` to exclude unnecessary files

**Acceptance criteria:**
- [ ] Pushing a branch produces a Vercel preview URL within 60 seconds
- [ ] Preview URL is commented on the PR by the Vercel bot
- [ ] Preview uses the same env vars as production (or a "preview" env if configured)

---

## Phase 3 — Quality & Operational (Week 3+)

These items improve the long-term health of the app and unlock new use cases. Tackle in roughly the order listed but reorder based on what hurts most.

### 3.1 PWA + offline support (P2, L)

**Problem:** The app already has PWA-ish meta tags (`apple-mobile-web-app-capable`, manifest.json) but no service worker, no offline support, no install prompt. Users can't check in when they have no signal.

**Approach:**
- Install `vite-plugin-pwa`
- Configure in `vite.config.js`:
  - `registerType: 'autoUpdate'`
  - Workbox: cache-first for assets, network-first for `/rest/v1/*` (Supabase API)
  - Manifest with proper icons (192, 512), theme colour, display: standalone
- Add an install prompt button (only when `beforeinstallprompt` fires)
- Offline check-in flow:
  - When network is down, save to IndexedDB queue
  - When back online, drain queue to Supabase
  - Show a "saving…" / "saved" / "queued offline" indicator
- Update on new deploy via the PWA's auto-update flow (toast: "New version available")

**Files affected:**
- `package.json` (vite-plugin-pwa, idb)
- `vite.config.js`
- `public/manifest.json` (already exists, may need updates)
- `public/icon-192.svg`, `public/icon-512.svg` (verify exist)
- `src/contexts/DataContext.jsx` (queue logic)
- `src/components/UpdatePrompt.jsx` (new)

**Acceptance criteria:**
- [ ] Lighthouse PWA audit passes
- [ ] App is installable from Chrome / Safari Add to Home Screen
- [ ] Disconnecting WiFi mid-checkin: save still appears to succeed, syncs when reconnected
- [ ] New deploy triggers update toast on existing client sessions

### 3.2 Zod runtime validation (P2, M)

**Problem:** All data shapes (daily_entries JSONB, profile updates, admin config) are validated only at the UI level. Anyone with the anon key + a URL could bypass and insert garbage. We rely on RLS to prevent it but RLS doesn't enforce shape.

**Approach:**
- Install `zod`
- Define schemas in `src/lib/schemas.js`:
  - `daySchema` (nutrition 0-5, exercise/mobilise/sleep/etc shapes, bonusApplied)
  - `profileSchema` (display_name, role, status enums, etc.)
  - `adminConfigSchema` (exercise types, hydration values, ranges)
- Validate before every save (`save(date, daySchema.parse(updatedDay))`)
- Validate after every fetch — `daySchema.safeParse(...)` — log mismatches to Sentry
- Migration of legacy boolean habit data: write a `migrateLegacyDay()` that takes old shape and returns new

**Files affected:**
- `package.json` (zod)
- `src/lib/schemas.js` (new)
- `src/lib/schemas.test.js` (new)
- `src/contexts/DataContext.jsx` (validate on save)
- `src/lib/dataStore.js`, `src/lib/supabaseStore.js` (validate on load)

**Acceptance criteria:**
- [ ] Zod schemas defined for daily entry, profile, admin config
- [ ] All `save()` paths validate before writing
- [ ] Invalid input throws a readable error (not silently corrupts state)
- [ ] Legacy boolean format still loads and migrates seamlessly
- [ ] At least 20 unit tests in schemas.test.js

### 3.3 Bundle audit (Recharts replacement?) (P2, M)

**Problem:** Recharts is 378KB (108KB gzipped). It dominates the Progress chunk. There may be lighter alternatives.

**Approach:**
- Run `npx vite-bundle-visualizer` (or similar) to see what's in the Progress chunk
- Evaluate alternatives:
  - **Visx** (Airbnb, modular) — only import what you use
  - **uPlot** (tiny, fast, less polished)
  - **Chart.js** (popular, ~120KB)
  - **Native SVG** (rewrite the 5 charts manually — most work, smallest output)
- Try a spike: rewrite the Cumulative chart in visx, measure bundle delta
- If <100KB savings, **don't bother** — Recharts is fine for this scale and is well-tested
- If >150KB savings, plan a migration over a few PRs

**Files affected:**
- Possibly `package.json` (different chart lib)
- `src/pages/Progress.jsx` (chart migration)

**Acceptance criteria:**
- [ ] Bundle visualisation captured + filed in solutions/
- [ ] Decision documented: replace, partial replace, or keep Recharts
- [ ] If replacing: Progress chunk drops at least 100KB gzipped
- [ ] All existing chart tests still pass

### 3.4 TypeScript progressive migration (lib/) (P2, L)

**Problem:** No type safety. Recent bugs (cumulative_by_day shape mismatch, role escalation) would have been caught at compile time. Full migration is too big to do at once.

**Approach:**
- Add `typescript` to devDependencies (already have `@types/react`)
- Add `tsconfig.json` with `allowJs: true`, strict mode
- Migrate pure-logic files first (no React):
  - `src/lib/scoring.js → scoring.ts`
  - `src/lib/stats.js → stats.ts`
  - `src/lib/bonuses.js → bonuses.ts`
  - `src/lib/exerciseStats.js → exerciseStats.ts`
  - `src/lib/recovery.js → recovery.ts`
  - `src/lib/dates.js → dates.ts`
- Define shared types in `src/lib/types.ts` (Day, Profile, Bonus, etc.)
- Tests stay as `.test.js` initially — vitest handles mixed
- Stop here for this phase. Don't migrate components until lib/ is solid.

**Files affected:**
- `package.json` (typescript)
- `tsconfig.json` (new)
- `src/lib/types.ts` (new)
- All `src/lib/*.js` → `*.ts`

**Acceptance criteria:**
- [ ] `tsc --noEmit` passes with strict mode
- [ ] All existing tests still pass
- [ ] Build succeeds
- [ ] No `any` types in migrated files (use `unknown` or proper types)

### 3.5 CHECK constraints on daily_entries (P2, S)

**Problem:** Even with Zod (item #14) + RLS, there's no defence-in-depth at the DB layer. A bug in the client could write nutrition: 999 and the DB would accept it.

**Approach:**
- New migration `20260412000009_daily_entries_check_constraints.sql`
- Add CHECK constraints:
  - `nutrition_score >= 0 AND nutrition_score <= 5`
  - `total_score >= 0 AND total_score <= 35`
  - JSONB shape constraints harder — Postgres doesn't have JSON Schema natively. Best alternative: validate via a `BEFORE INSERT/UPDATE` trigger that calls a plpgsql function to inspect required keys
- Or: split JSONB columns into structured columns where it makes sense

**Files affected:**
- `supabase/migrations/20260412000009_daily_entries_check_constraints.sql` (new)
- Possibly `src/lib/supabaseStore.js` if shape needs adjusting

**Acceptance criteria:**
- [ ] Migration applied
- [ ] Trying to insert nutrition_score = 99 via REST API returns 400
- [ ] Existing valid data still passes constraint validation
- [ ] No regressions in test suite

### 3.6 Auth expiry / TOKEN_REFRESHED handling (P2, S)

**Problem:** Supabase JWTs expire after 1 hour. The client refreshes them automatically, but if refresh fails (revoked token, network issue, etc.) the next save silently fails. The user thinks their data saved but it didn't.

**Approach:**
- In `AuthContext.jsx`, listen for `TOKEN_REFRESHED` event
- On refresh failure (no event fires after expiry, or `SIGNED_OUT` fires unexpectedly), surface a banner: "Your session expired. Please sign in again."
- Force a full sign-out flow so the user re-authenticates cleanly
- Add a user-visible "saving…" / "saved" / "save failed" indicator on the CheckIn page (overlap with item #19)

**Files affected:**
- `src/contexts/AuthContext.jsx`
- `src/components/SessionExpiredBanner.jsx` (new)
- `src/App.jsx`

**Acceptance criteria:**
- [ ] Manually expiring the JWT in localStorage causes the banner to appear within 30 seconds
- [ ] Clicking the banner triggers re-sign-in
- [ ] No silent save failures after token refresh failure

### 3.7 Network retry queue + saving indicator (P2, M)

**Problem:** `saveDay()` is fire-and-forget. If a save fails (offline, 5xx, RLS denial), the user sees no error and the data is lost.

**Approach:**
- Wrap `save()` in a retry-with-backoff helper (3 attempts, 1s/2s/4s backoff)
- On final failure, queue to IndexedDB (overlap with item #13 PWA)
- Add a global `<SyncStatusIndicator>` component in the header showing:
  - "Saved" (green check, 2s after success)
  - "Saving…" (spinner)
  - "Will retry" (yellow, count of queued items)
  - "Save failed — tap to retry" (red)
- Hook into the auto-sync as well

**Files affected:**
- `src/lib/supabaseStore.js` (retry wrapper)
- `src/contexts/DataContext.jsx` (queue + status state)
- `src/components/SyncStatusIndicator.jsx` (new)
- `src/components/Layout.jsx` (mount indicator)

**Acceptance criteria:**
- [ ] Simulated network failure: indicator shows "Saving…" → "Will retry" → eventually "Saved" when network returns
- [ ] User can see save state at all times
- [ ] No silent data loss in any scenario

### 3.8 404 NotFound page (P2, XS)

**Problem:** `https://wholelifechallenge.parnellsystems.com/random-path` whitescreens. No nav, no back button, no orientation.

**Approach:**
- Create `src/pages/NotFound.jsx` — 404 page with icon, message, "Go home" button
- Add to Routes: `<Route path="*" element={<NotFound />} />`
- Make sure it's still inside the Layout (so nav is visible)

**Files affected:**
- `src/pages/NotFound.jsx` (new)
- `src/App.jsx`

**Acceptance criteria:**
- [ ] `/some/random/path` shows the 404 page, not whitescreen
- [ ] 404 page is inside the Layout (nav visible)
- [ ] "Go home" button navigates to `/`

### 3.9 /health endpoint (P2, S)

**Problem:** When something breaks, it's hard to tell what's broken. Is Supabase down? Vercel? My code? A simple health check answers "is the basic stack alive?"

**Approach:**
- Vite is a static SPA — there's no server endpoint to add a route to
- Two options:
  - **(a)** Static `public/health.json` with `{status: "ok"}` and ship the build SHA in it. Doesn't actually check Supabase, but tells you the deploy is reachable.
  - **(b)** A `/health` route in the React app that on mount pings Supabase (`supabase.from('profiles').select('count').limit(0)`) and renders OK/DOWN
- Recommend (b) — actually useful as a manual smoke test

**Files affected:**
- `src/pages/Health.jsx` (new)
- `src/App.jsx`
- (Optional) `public/health.json`

**Acceptance criteria:**
- [ ] `/health` page renders "All systems operational" when Supabase is reachable
- [ ] Renders "Supabase unreachable" when query fails
- [ ] Includes git SHA + deploy time

### 3.10 Project docs site fleshed out (P2, M)

**Problem:** `docs/index.html` exists in Deep Ocean Tech style but is minimal. The CLAUDE.md global standard requires every project to have a proper docs site with bento grid + glass cards + plan-progress dashboard, linked from the gilesparnell.github.io hub.

**Approach:**
- Compare against SprintTracker as the exemplar
- Update `docs/index.html` with bento grid sections:
  - Live app link
  - Tech stack
  - Recent commits / activity
  - Link to user guide
  - Link to plans
  - Link to runbook
- Update `docs/user-guide.html` with screenshots + walkthroughs
- Create `docs/diagrams/plan-progress.html` — workstream cards showing Phase 1/2/3/4 status
- Enable GitHub Pages via `gh api repos/gilesparnell/wholeLifeChallenge/pages -X POST ...`
- Add WLC card to the gilesparnell.github.io hub repo

**Files affected:**
- `docs/index.html`
- `docs/user-guide.html`
- `docs/diagrams/plan-progress.html` (new)
- `gilesparnell.github.io/index.html` (in another repo)

**Acceptance criteria:**
- [ ] `https://gilesparnell.github.io/wholeLifeChallenge/` serves the project docs
- [ ] Docs match SprintTracker design language
- [ ] Hub page has a WLC card linking to the docs site
- [ ] Plan progress dashboard reflects current phase status

### 3.11 Operational runbook (P2, S)

**Problem:** When something breaks at 11pm, you stare at a Vercel deploy log with no idea what to do. A one-page runbook saves panic.

**Approach:**
- Create `docs/runbook.md` with sections:
  - **Supabase down**: check status.supabase.com, try `supabase db ping`, fallback: app shows offline mode
  - **Vercel deploy failed**: check build logs, common causes (env var missing, lockfile mismatch), rollback via `vercel rollback`
  - **User locked out**: re-add their email to allowed_emails, check profile.status = active
  - **Stuck on Loading**: clear localStorage (auth token corruption)
  - **Restore from backup**: walk through `supabase db reset` + applying backup.sql
  - **RLS broke after migration**: rollback migration, run security advisor
  - **Sentry alert spam**: check for runaway error loops, bump rate limits
- Link from README and docs site

**Files affected:**
- `docs/runbook.md` (new)
- `README.md` (link)

**Acceptance criteria:**
- [ ] Runbook exists with at least 7 scenarios
- [ ] Each scenario has: symptom, diagnosis steps, fix steps, verification
- [ ] Linked from README

### 3.12 GDPR data export button (P2, S)

**Problem:** EU users have a right to export their data on demand. Even outside the EU, "give me my data" is a reasonable user expectation.

**Approach:**
- Add a "Download my data" button to the future /settings page (or for now, on the leaderboard page where the opt-in toggle lives)
- On click:
  - Fetch all `daily_entries` for the current user
  - Fetch the user's `profile` row
  - Wrap in a JSON object: `{ profile: {...}, entries: [...], exported_at: ISO }`
  - Use `Blob` + `URL.createObjectURL` to trigger a browser download
  - Filename: `wlc-export-${userId}-${date}.json`

**Files affected:**
- `src/lib/dataExport.js` (new)
- `src/lib/dataExport.test.js` (new)
- `src/pages/Leaderboard.jsx` or future `src/pages/Settings.jsx`

**Acceptance criteria:**
- [ ] Clicking the button downloads a valid JSON file
- [ ] File contains all of the user's entries + profile data
- [ ] No other users' data leaks through
- [ ] Re-importing the data structure round-trips cleanly

### 3.13 Privacy policy page (P2, S)

**Problem:** No privacy policy. Required by Google OAuth for production apps, expected by users, required by GDPR if any EU traffic.

**Approach:**
- Create `src/pages/Privacy.jsx` with sections:
  - What data we collect (auth provider data, daily entries, self-report, optional weight)
  - Where it lives (Supabase, EU region — verify)
  - Who sees it (only the user, plus admins for moderation only — never reflections)
  - Retention (until user deletes account, then immediate)
  - Third parties (Supabase, Vercel, Sentry, PostHog)
  - User rights (export, delete, deactivate)
  - Contact
- Add to nav (or footer)
- Add to OAuth consent screen URL

**Files affected:**
- `src/pages/Privacy.jsx` (new)
- `src/App.jsx`
- `src/components/Layout.jsx` (footer link)
- Google Cloud Console (set Privacy URL on OAuth consent screen)

**Acceptance criteria:**
- [ ] `/privacy` page renders
- [ ] Linked in footer
- [ ] Linked from OAuth consent screen
- [ ] Reviewed against GDPR Article 13 minimum disclosures

### 3.14 Cookie / storage notice (P2, XS)

**Problem:** App uses localStorage (theme, auth token, dev user, leaderboard cache). EU users would expect a notice. PostHog (item #10) adds analytics cookies — those definitely require consent.

**Approach:**
- Light-touch implementation: a one-time banner on first visit
  - "We use local storage for your preferences and login session. By using this app you accept this. [OK]"
- Set `localStorage['wlc-cookies-acked'] = 'true'` to dismiss
- Once PostHog is in: split the notice into "Strictly necessary" (always on) and "Analytics" (opt-out toggle)
- Don't use a third-party cookie library — overkill

**Files affected:**
- `src/components/CookieBanner.jsx` (new)
- `src/App.jsx`

**Acceptance criteria:**
- [ ] Banner shows on first visit
- [ ] Clicking OK dismisses and persists
- [ ] If analytics opted out, posthog never initialises

### 3.15 Supabase quota alarms (P2, XS)

**Problem:** Free tier has limits (500 MB DB, 50K monthly active users, 5 GB egress). When you hit them, the app silently breaks. No advance warning.

**Approach:**
- Supabase dashboard → Project Settings → **Usage** → Set up usage alerts
- Set alerts at 80% for:
  - Database size
  - Auth users
  - Egress
  - API requests
- Email alerts to your address
- No code change

**Files affected:**
- Supabase dashboard (no code change)

**Acceptance criteria:**
- [ ] Alerts configured for all four metrics
- [ ] Email destination set
- [ ] Alert thresholds documented in runbook

---

## Phase Summary

| Phase | Items | Effort | Risk | Dependencies | Status |
|-------|-------|--------|------|--------------|--------|
| **P0: Critical** | 1, 2, 3, 4, 5, 6 | 1–2 days | Low | None — internal changes only | ✅ **COMPLETE** (2026-04-12, merged via PR #2 + #3) |
| **P1: Polish & Observability** | 7, 8, 9, 10, 11, 12 | 2–3 days | Low | P0 done (Sentry hooks into ErrorBoundary) | 🚧 IN PROGRESS (#12 done; #9 next) |
| **P2: Quality & Operations** | 13–27 | 1+ week | Mixed | Some interdependencies (PWA + retry queue, Settings + GDPR) | 📋 Not started |

## Acceptance Criteria

### Phase 1 (P0) — ✅ COMPLETE (2026-04-12)
- [x] App no longer whitescreens on component errors (recovery UI)
- [x] All production errors visible in Sentry within 60s (verified via smoke test — lock-steal error captured on first prod session)
- [x] Daily backup runs successfully and produces a usable artefact (first run: 48s, 2 SQL files downloaded + inspected)
- [x] Supabase Security Advisor reports zero error/warn items (only non-applicable auth_leaked_password_protection remains — documented)
- [x] README answers "what is this and how do I run it" in <5 minutes
- [x] User deletion produces no orphan rows (verified via tx+rollback test on live DB)

### Phase 2 (P1)
- [ ] Lighthouse: ≥90 mobile / ≥95 desktop on Performance, Accessibility, Best Practices, SEO
- [ ] WCAG AA contrast verified for both themes
- [ ] CI runs on every PR and blocks merges if red
- [ ] PostHog dashboard shows live user activity
- [ ] Branch protection prevents direct pushes to main
- [ ] Vercel preview URLs commented on PRs

### Phase 3 (P2)
- [ ] App is installable and works offline
- [ ] Zod validates all writes; no silent corruption possible
- [ ] Bundle audit decision documented; replacement done if worth it
- [ ] All `src/lib/` files migrated to TypeScript with strict mode
- [ ] DB-level CHECK constraints in place
- [ ] Session expiry surfaced to user with retry path
- [ ] Sync queue makes data loss impossible
- [ ] 404 page exists
- [ ] /health route works
- [ ] Project docs site published at gilesparnell.github.io/wholeLifeChallenge/
- [ ] Runbook covers ≥7 scenarios
- [ ] GDPR export button downloads user's data
- [ ] Privacy policy live + linked from OAuth consent
- [ ] Cookie banner on first visit
- [ ] Supabase usage alerts configured

## Dependencies & Prerequisites

| Phase | Needs |
|-------|-------|
| All | Supabase CLI linked (already done) |
| 1.2 (Sentry) | Sentry account + DSN, Vercel env var setup permission |
| 1.3 (Backup) | GitHub Actions enabled (default), `SUPABASE_ACCESS_TOKEN` secret |
| 2.4 (PostHog) | PostHog account + API key, Vercel env var |
| 2.5 (Branch protection) | GitHub repo admin |
| 3.1 (PWA) | Icon assets (`icon-192.svg`, `icon-512.svg`) finalised |
| 3.13 (Privacy policy) | Google Cloud Console access for OAuth consent screen |

## Risk Analysis & Mitigation

| Risk | Phase | Likelihood | Impact | Mitigation |
|------|-------|-----------|--------|------------|
| RLS audit reveals critical bug | 1.4 | Medium | High | Fix immediately via migration; document in solutions |
| Sentry rate-limited by error storm | 1.2 | Low | Medium | Configure ignoreErrors + quota cap; monitor first week |
| GitHub Actions cron times out | 1.3 | Low | Medium | Backup script has 10-minute timeout; alert on failure |
| Branch protection locks me out | 2.5 | Low | High | Allow self-approval; admin can bypass in emergency |
| TS migration breaks tests | 3.4 | Medium | Low | Migrate one file at a time; tests run after each |
| PWA caching serves stale data | 3.1 | Medium | Medium | Network-first strategy for Supabase API; cache-bust on deploy |
| Zod migration breaks legacy data | 3.2 | Medium | Medium | Schema includes legacy union types + auto-migration |
| Recharts replacement worse than current | 3.3 | Medium | Low | Spike one chart first; revert if gain <100KB |

## Sources & References

### Internal references
- Existing plans: `docs/plans/2026-04-11-001-feat-multi-user-wlc-tracker-v2-plan.md`, `docs/plans/2026-04-12-001-feat-wlc-v3-ux-dashboard-ai-reflections-plan.md`
- AuthContext: `src/contexts/AuthContext.jsx` (Sentry hook target, token refresh handling)
- Data layer: `src/contexts/DataContext.jsx`, `src/lib/supabaseStore.js`, `src/lib/dataStore.js`
- Existing migrations: `supabase/migrations/20260412000001..006`
- Vite config: `vite.config.js`
- Package manifest: `package.json`
- Global standards: `~/.claude/CLAUDE.md` (Project Documentation Standard, Background Monitoring)

### External references
- [React Error Boundary docs](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Sentry React SDK](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Supabase Backups](https://supabase.com/docs/guides/platform/backups) — paid only, hence GitHub Action approach
- [Supabase Security Advisor](https://supabase.com/docs/guides/database/database-advisors)
- [Lighthouse scoring guide](https://developer.chrome.com/docs/lighthouse/overview/)
- [WCAG AA contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Zod docs](https://zod.dev/)
- [PostHog React SDK](https://posthog.com/docs/libraries/react)
- [GDPR Article 13](https://gdpr-info.eu/art-13-gdpr/) — required disclosures

### Related work
- SprintTracker exemplar docs site: https://gilesparnell.github.io/SprintTracker/
- SprintTracker auth pattern: `/Users/gilesparnell/Documents/VSStudio/parnell-systems/sprint-tracker/src/lib/auth.ts`
