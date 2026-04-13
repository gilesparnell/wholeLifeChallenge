# Project rules — Whole Life Challenge

These rules apply to all work in this repo and override defaults where they conflict.

## Versioning — bump on every PR

The app displays its version in the footer and on `/health` as `vX.Y.Z (sha7)`. The semver part comes from `package.json`. **Every PR that ships code to production MUST bump the `version` field in `package.json` and add a matching entry to `CHANGELOG.md` before merge.**

Bump rules:
- **patch** (`0.0.x`) → bug fix, copy tweak, dependency bump, refactor
- **minor** (`0.x.0`) → new feature, new page, new tracked event, new env var
- **major** (`x.0.0`) → breaking change (rare; ask before bumping major)

Workflow:
1. Make the code change on a feature branch
2. Bump `package.json` `version`
3. Add a new section at the top of `CHANGELOG.md` with the new version + date + bullet list of changes
4. Both files go in the same commit/PR as the code change
5. The CI workflow + branch protection ensure the bumped version reaches production via the normal merge path

PRs that only touch documentation, CLAUDE files, or local-only tooling don't need a version bump — but if in doubt, bump.

## Migrations are manual

Supabase migrations in `supabase/migrations/` are NOT auto-applied on deploy. After merging a PR with a new migration file:
1. Open Supabase Dashboard → SQL Editor → New Query
2. Paste the migration contents
3. Click Run
4. Note in the PR comment that the migration has been applied

The migration files use idempotent `DO $$ ... EXCEPTION` blocks where possible so they're safe to re-run.

## Tests must pass before merge

Branch protection on master requires the `Lint · Test · Build` CI check to be green. No exceptions, no `--no-verify`, no force-pushes.

`npx vitest run` should pass locally before pushing. Current count is in the `CHANGELOG.md` history if you need a baseline.

## Don't add deps without a reason

The dependency tree is small on purpose. Before adding a new npm package:
1. Can it be done in 30 lines of hand-written code?
2. Does it have a healthy peer dep range that includes our current Vite/React/etc. versions?
3. Does `npm audit` come back clean?

Recent example: `vite-plugin-pwa` was the obvious answer for a service worker, but it lagged a Vite major version and pulled in 4 high-severity transitive CVEs. We hand-rolled `public/sw.js` instead — 70 lines, zero new deps. Default to the hand-roll for small things.

## Production hardening plan

The active project plan is `docs/plans/2026-04-12-002-feat-wlc-production-hardening-plan.md`. Read the "Rescope decision" section for what we're shipping vs. dropping. Most P2 items have been dropped; remaining work is open-up-gate items (#24/#25/#26 GDPR/privacy/cookie) which only matter if we open beyond the 4-user whitelist.
