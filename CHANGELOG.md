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

First version that was production-hardened end-to-end. Reflects "almost at a stable 1.0", with the remaining gap being the optional GDPR / privacy / cookie items (only relevant if the app opens beyond its current 4-user whitelist).

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
- Pre-existing production hardening baseline rolled into this release: Sentry error tracking with `ignoreErrors` filter, daily Supabase backup GitHub Action, RLS security audit + cascade-delete trigger, React ErrorBoundary with two layers (app-wide + per-route), CI workflow (lint + test + build) on every push/PR, branch protection on master, WCAG AA contrast across both themes, 404 NotFound page, `/health` endpoint, auth expiry banner on the login screen, optimistic save + retry queue + `SaveStatusIndicator`, defensive localStorage backup on every save, CHECK constraints + client validator on `daily_entries`, PostHog product analytics with PII-stripping wrapper.
