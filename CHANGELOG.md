# Changelog

All notable changes to the WLC tracker. Bumped on every PR that ships to production.

The version shown in the app footer (`vX.Y.Z (sha)`) and on `/health` matches the entries below.

## Conventions

- **patch** (`0.0.x`) — bug fixes, copy tweaks, dependency bumps
- **minor** (`0.x.0`) — new features, new pages, new tracked events
- **major** (`x.0.0`) — breaking changes (rare for an internal app)

Bump in `package.json` and add a new entry below **before merging the PR**. The semver in the footer comes from `package.json` at build time.

---

## [0.10.0] — 2026-04-13

### Added
- `/changelog` page that renders this file's contents, with h1/h2/h3/bullet list/hr rendering via a tiny custom markdown parser (no new deps)
- Version footer in the Layout is now a clickable link to `/changelog` — tap the `vX.Y.Z (sha)` string at the bottom of any page to see what's new
- `X` close button on the changelog page uses `useNavigate(-1)` so it returns to whichever page you came from

---

## [0.9.6] — 2026-04-13

### Fixed
- iOS PWA: app header buttons (theme toggle, sign out) were being overlapped by the iOS status bar (signal, wifi, battery) when running in standalone mode. Added `env(safe-area-inset-*)` padding to `.wlc-container` so content sits below the status bar and above the home indicator. Also handles notch / Dynamic Island left/right insets in landscape.

---

## [0.9.5] — 2026-04-13

First tracked release. Captures everything in master at the point version tracking was introduced. The app is feature-complete and production-hardened — `0.9.5` reflects "almost at a stable 1.0", with the remaining gap being the optional GDPR/privacy/cookie items that only matter if the app opens beyond its current 4-user whitelist. The next functional 1.0 marker is at the discretion of the maintainer.

**Production hardening complete:**
- Sentry error tracking + ignoreErrors filter
- Daily Supabase backup workflow
- RLS security audit + cascade-delete trigger
- React ErrorBoundary (app-wide + per-route)
- CI workflow (lint + test + build) on every push and PR
- Branch protection on master
- WCAG AA contrast across both themes
- 404 NotFound page
- `/health` endpoint
- Auth expiry banner on the login screen
- Optimistic save + retry queue + status indicator
- Defensive localStorage backup on every save
- CHECK constraints + client validator on `daily_entries`
- PostHog product analytics with PII-stripping wrapper
- Service worker (stale-while-revalidate) + UpdateToast

**This release adds:**
- `package.json` semver tracking + display in footer and on `/health`
- `CHANGELOG.md` (this file)
- Service worker for offline support and instant cold start
- "New version available" toast when a fresh service worker takes over
- Build-time SHA + timestamp injected via `vite.config.js` `define`
- Icon cleanup: removed stale "42" from `public/icon-192.svg`
