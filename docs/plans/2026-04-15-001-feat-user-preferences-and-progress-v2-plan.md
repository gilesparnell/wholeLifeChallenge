# Plan — User Preferences + Progress v2 (0.11.0)

**Date:** 15 Apr 2026
**Branch:** `feat/preferences-and-progress-v2`
**Target version:** `0.11.0`
**Scope:** Two feature areas shipped together on one branch, one PR. Executed autonomously overnight.

---

## Background

Two feature requests from the user on 15 Apr 2026:

1. **Two-tier admin / user preferences** — the app currently has a single binary `profiles.role` flag and a single global `wlc-admin-config` in localStorage. Only admins can change settings. Standard users (Barney) can't personalise things like their own water target. Need a per-user preferences layer that merges with (and overrides) the global config at read time.

2. **Progress board metrics** — the Progress page currently renders 9 visualisations but only surfaces ~40% of the data the app collects. The user wants "anything graphic and visual and sexy" to give to their players. 13 new metrics identified from a codebase audit.

---

## Design decisions (answered in conversation)

### Preferences

- **Schema:** new `preferences jsonb DEFAULT '{}'::jsonb` column on `profiles`. No new table. Idempotent migration.
- **Personalisable settings (v1):** `hydrationTargetMl`, `hydrationIncrementMl`, `sleepTargetHours`. Everything else (challenge dates, exercise types, mobilise types, whitelist, scoring) stays global / admin-only.
- **Screen name:** "My Preferences" (in `src/pages/MyPreferences.jsx`).
- **Entry point:** hamburger menu on the right-hand side of the header replacing the current individual buttons (admin link, theme toggle, sign out). Menu contains: My Preferences, Admin Panel (conditional on `isAdmin`), Theme toggle, Sign out.
- **Effective config:** new `getEffectiveConfig(profile)` helper in `src/lib/adminConfig.js` that spreads the global config then overlays `profile.preferences`. `CheckIn.jsx` switches from `getConfig()` to `getEffectiveConfig(profile)` so Barney's override flows through to `HydrateCard`.
- **Persistence:** user overrides persist across admin changes to the global config.
- **Daily entry honesty:** stored `target_ml` on `daily_entries.hydrate` reflects the **effective** target at save time.
- **Admin-editing-user-prefs:** out of scope for v1.

### Progress v2

- **Scope:** all 13 metrics from the agreed list (see list below). Skipping time-of-day heatmap and activity-type trends because they need new data collection.
- **Correlation algorithm:** simple Pearson r. Surface only `|r| > 0.3` AND `n >= 7 days`. Otherwise show "come back in a week" placeholder.
- **Calendar heatmap:** one grid covering the whole challenge, hand-rolled SVG.
- **"At current pace" projection:** extend cumulative line to challenge end date only (not past).
- **Peer delta:** reuses existing leaderboard data. Small info tooltip explaining exactly what is shared (same data as leaderboard, no new disclosure).
- **Insufficient data:** each new chart hides if not enough data yet — existing `hasExerciseDuration` / `hasRecoveryData` pattern.

### Workflow

- **One feature branch, one PR.** Commits organised per phase so each commit is reviewable in isolation.
- **TDD throughout.** Pure helpers get full unit test coverage. Components get smoke render tests. Full suite must pass before PR.
- **Version:** 0.11.0 (minor bump — new features, new page, new route).
- **Migration:** paste the SQL into the PR body. User applies manually in Supabase Dashboard per `CLAUDE.md` rule. Verification query included.

---

## New metrics — the full list

### Easy wins (data exists, just needs rendering)

1. Sleep hours trend (line chart, target band overlay)
2. Mood / energy / stress / soreness small-multiples (sparklines)
3. Bonus progress dashboard (4 progress bars toward next bonus)
4. Habit streaks strip (🔥 per habit)
5. Hydration progress chart (daily fill vs target)

### New visual treatments

6. GitHub-style calendar heatmap (whole challenge in one grid)
7. Radar / spider chart per week (6 axes, week selector)
8. Recovery × strain scatter (2D scatter, week-coloured)
9. Personal-best ⭐ markers on existing daily score chart
10. Headline stat cards (best week, longest streak, consistency %)

### Smart / insight

11. "At current pace" cumulative projection
12. Peer delta trend (vs group average over time, with info tooltip)
13. Correlation insights (Pearson r cards, threshold-gated)

### Page ordering

Top → bottom on `/progress`:

1. Stat cards
2. Streaks strip
3. Bonus progress
4. Existing daily score + cumulative (now with PB markers + projection)
5. New Wellness section (sleep / mood sparklines / hydration)
6. Existing habit breakdown / weekly minutes / duration / activity breakdown
7. New Deep Dives section (calendar / radar / scatter)
8. Existing habit heatmap + weekly totals
9. Peer delta
10. Correlation insights

---

## Execution phases

| # | Phase | Files touched | Tests |
|---|---|---|---|
| 0 | Branch + plan doc | this file | — |
| 1 | Preferences backend | migration, `src/lib/adminConfig.js`, `src/lib/supabaseStore.js` (profile read/write) | unit tests for `getEffectiveConfig` |
| 2 | Preferences UI | `src/pages/MyPreferences.jsx`, `src/components/HeaderMenu.jsx`, `src/App.jsx`, `src/pages/CheckIn.jsx` | component + integration tests |
| 3 | Progress pure helpers | `src/lib/progressMetrics.js` | full unit coverage (happy / sad / edge per function) |
| 4 | Top-of-page components | `src/components/progress/StatCards.jsx`, `StreaksStrip.jsx`, `BonusProgress.jsx`, `src/pages/Progress.jsx` | smoke render tests |
| 5 | Existing chart augmentation | `src/pages/Progress.jsx` | updated snapshot behaviour |
| 6 | Wellness section | `src/components/progress/SleepHoursChart.jsx`, `WellnessSparklines.jsx`, `HydrationProgressChart.jsx` | smoke render tests |
| 7 | Deep-dive section | `src/components/progress/CalendarHeatmap.jsx`, `RadarWeek.jsx`, `RecoveryStrainScatter.jsx` | smoke render + helper tests |
| 8 | Insights | `src/components/progress/PeerDeltaChart.jsx`, `CorrelationInsights.jsx` | helper tests for correlation math |
| 9 | CHANGELOG + version bump | `CHANGELOG.md`, `package.json` | — |
| 10 | Full suite + build verification | — | **all 528+ tests green, build exit 0, lint 0 errors** |
| 11 | Push + open PR | — | — |

---

## Acceptance criteria

- [ ] Barney can sign in as a standard user, open My Preferences from the hamburger, set his water target to 2000ml, save, return to the daily check-in, and see the HydrateCard displaying his target (not the global 3000ml).
- [ ] Admin panel still controls the global default. Admin changing the global does not wipe Barney's override.
- [ ] Progress page renders all 13 new visualisations in the agreed order when sufficient data exists.
- [ ] Each new chart hides gracefully when data is insufficient — same pattern as existing conditional charts.
- [ ] Correlation insights only appear when `|r| > 0.3` AND `n >= 7`. Placeholder otherwise.
- [ ] Peer delta has a small info icon / tooltip explaining what data is shown.
- [ ] Full vitest suite passes (currently 528 tests, will be more after TDD adds coverage).
- [ ] `npm run build` exits 0.
- [ ] `npm run lint` has 0 errors (pre-existing warnings tolerated).
- [ ] `package.json` at `0.11.0`, `CHANGELOG.md` has a matching entry.
- [ ] PR body includes the exact SQL migration + verification query for manual apply.
- [ ] Memory note `project_wlc_admin_config_sync.md` is flagged for update once this ships (admin config is no longer localStorage-only).

---

## Known risks + mitigations

- **Header refactor breaks existing pages.** Mitigation: tests cover menu rendering + interaction; visually verify via build.
- **Migration applied to production with existing data.** Mitigation: `ADD COLUMN IF NOT EXISTS` + default `'{}'::jsonb` means zero downtime, no backfill needed.
- **Recharts performance with many series on mobile.** Mitigation: each new chart is lazily imported via the existing Suspense boundary on the Progress page; no extra work.
- **Correlation insights surfacing misleading pairs.** Mitigation: threshold gating (`|r| > 0.3`, `n >= 7`) + fallback placeholder; the cards are framed as "patterns we're seeing", not medical advice.
- **Branch diverges from other open PRs (0.10.4 rubber-band, 0.10.5 changelog backfill).** Mitigation: file overlap is only `package.json` and `CHANGELOG.md`; any merge conflict is trivial to resolve (take the higher semver + merge the changelog entries in chronological order).

---

## What I'll need from the user in the morning

1. Review the PR.
2. Apply the Supabase migration in the Dashboard (SQL pasted in PR body).
3. Merge the three open PRs in order: `fix/ios-pwa-overscroll` → `docs/backfill-changelog-history` → this one. Each will need a small rebase for `package.json` / `CHANGELOG.md` collisions.
4. Update the `project_wlc_admin_config_sync.md` memory note to reflect that per-user preferences now exist.
