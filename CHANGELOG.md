# Changelog

All notable changes to the WLC tracker. Bumped on every PR that ships to production.

The version shown in the app footer (`vX.Y.Z (sha)`) and on `/health` matches the entries below.

## Conventions

- **patch** (`0.0.x`) — bug fixes, copy tweaks, dependency bumps
- **minor** (`0.x.0`) — new features, new pages, new tracked events
- **major** (`x.0.0`) — breaking changes (rare for an internal app)

Each entry is split into:
- **What's new** — customer-facing outcomes. What you'll notice, in your own words.
- **Under the hood** — technical detail for future-me debugging. Shown in a dimmer style on the `/changelog` page so it doesn't compete with the user-facing bullets.

Bump in `package.json` and add a new entry below **before merging the PR**. The semver in the footer comes from `package.json` at build time.

---

## [0.10.2] — 2026-04-13

### What's new
- The changelog page now separates customer-facing changes from technical detail. "What's new" is for things you'll notice; "Under the hood" is dimmer text underneath for the developer notes.
- Rewrote every existing entry in the new format so the whole history is consistent.

### Under the hood
- New `src/lib/annotateChangelogBlocks.js` walks the parsed markdown blocks and tags each one with a `dim` flag based on which h3 section it lives under. h2/hr resets to non-dim.
- `src/pages/Changelog.jsx` now reads the `dim` flag and renders bullet lists in `textDim` and "Under the hood" h3 headings in `textFaint` — same font size, lower contrast, still readable.
- 14 unit tests on `annotateChangelogBlocks` covering each heading type, case insensitivity, synonyms ("Dev notes", "Technical"), section resets, and a full realistic multi-entry fixture.
- Global `~/.claude/CLAUDE.md` updated so the format applies to all future projects.

---

## [0.10.1] — 2026-04-13

### What's new
- The "New version available — Refresh" toast now actually fires when you deploy. Previously it was silently broken, which is why you'd been manually refreshing every deploy.
- From now on, future deploys should land automatically: you merge a PR, Vercel deploys, the toast slides up at the bottom of your open session, you tap Refresh, done.

### Under the hood
- Moved `public/sw.js` to `src/sw.template.js` with a `__WLC_BUILD_ID__` placeholder. A new inline Vite plugin (`wlcServiceWorkerPlugin` in `vite.config.js`) substitutes the placeholder with the git SHA at build time and emits the result as `dist/sw.js`.
- The old SW file was byte-identical between every deploy, so the browser never fired `updatefound` and the UpdateToast never showed for anyone.
- `CACHE_NAME` now includes the build SHA (`wlc-cache-<sha>`) so old caches are purged automatically in the `activate` handler.
- Background fetch in `staleWhileRevalidate` now uses `event.waitUntil(fetchPromise)` so the service worker stays alive until the cache update completes.
- New `src/lib/substituteBuildId.js` helper with 8 unit tests, shared between the build plugin and the dev-server middleware.

---

## [0.10.0] — 2026-04-13

### What's new
- Tap the version number in the footer of any page to jump to a new `/changelog` page showing the release history.
- An X button in the top-right closes the changelog and returns you to the page you came from.

### Under the hood
- New `/changelog` route, lazy-loaded via Suspense so it doesn't inflate the main bundle.
- `src/pages/Changelog.jsx` renders blocks parsed from `CHANGELOG.md` (imported via Vite's `?raw` loader).
- Hand-rolled markdown parser in `src/lib/parseChangelog.js` — handles the keep-a-changelog subset (h1/h2/h3/bullets/hr). No new deps per the project rule; 12 unit tests cover the parser.
- Layout footer version string is now a `<Link>` to `/changelog`.
- `CHANGELOG.md` at the repo root remains the single source of truth — edit it, the page updates on next build with no manual sync.

---

## [0.9.6] — 2026-04-13

### What's new
- iOS PWA: header buttons (theme toggle, sign out) are no longer hidden behind the iOS status bar when running as a home-screen app. You can reach the theme toggle again.

### Under the hood
- Added `env(safe-area-inset-*)` padding to all four sides of `.wlc-container` in `src/components/Layout.jsx`, in both the mobile and desktop media query branches.
- Handles the Dynamic Island / notch ear cutouts in landscape + the home-indicator bar at the bottom. `env(safe-area-inset-*)` is a no-op on desktop and in regular Safari, so it's safe to apply universally.
- Root cause: `index.html` has `apple-mobile-web-app-status-bar-style="black-translucent"` + `viewport-fit=cover`, which tells iOS the app draws under the status bar — and the app is then expected to add the inset padding. We'd never added it.

---

## [0.9.5] — 2026-04-13

First tracked release. The app was feature-complete and production-hardened at this point; `0.9.5` reflects "almost at a stable 1.0", with the remaining gap being the optional GDPR / privacy / cookie items (only relevant if the app opens beyond its current whitelist).

### What's new
- Version tracking is now visible in the app. The footer of every page shows `vX.Y.Z (sha7)` at the bottom.
- `/health` endpoint now shows the version + build timestamp alongside the OK / DOWN status, so you can verify exactly which deploy you're on.
- Service worker installed for offline-capable loads. First visit caches the shell; future visits start instantly from cache.
- The `CHANGELOG.md` file (this one) is introduced as the one-and-only source of truth for what shipped when.
- Home screen icon cleaned up — removed the stale "42" that was left over from when this was a 42-day challenge.

### Under the hood
- `package.json` bumped `0.0.0` → `0.9.5`; the semver is injected at build time via `vite.config.js`'s `define` option alongside the git SHA (`__APP_VERSION__`, `__APP_SEMVER__`, `__BUILD_TIME__`).
- `src/lib/version.js` exposes `getVersion`, `getShortVersion`, `getSemver`, `getBuildTime`, `getDisplayVersion` — all reading from the build-time globals.
- `public/sw.js` (later moved and fixed in 0.10.1) handles stale-while-revalidate caching with bypass for Supabase / PostHog / Sentry.
- `src/lib/serviceWorker.js` wraps registration with an `onUpdateAvailable` callback so the app knows when to show a refresh toast.
- `src/components/UpdateToast.jsx` renders the "New version available" pill, wired into `App.jsx`.
- Pre-existing production hardening also rolled into this release: Sentry error tracking with ignoreErrors filter, daily Supabase backup GitHub Action, RLS security audit + cascade-delete trigger, React ErrorBoundary with two layers, CI workflow (lint + test + build) on every push/PR, branch protection on master, WCAG AA contrast across both themes, 404 NotFound page, `/health` endpoint, auth expiry banner on the login screen, optimistic save + retry queue + `SaveStatusIndicator`, defensive localStorage backup on every save, CHECK constraints + client validator on `daily_entries`, PostHog product analytics with PII-stripping wrapper.
