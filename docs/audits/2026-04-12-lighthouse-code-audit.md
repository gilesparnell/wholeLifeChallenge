---
title: Lighthouse-style code audit
date: 2026-04-12
scope: Phase 2 #7 of production hardening plan
status: complete
---

# Lighthouse-style code audit (2026-04-12)

Code-level equivalent of a Lighthouse audit, run against the `feat/phase2-3-overnight` build (commit d8ab0a3). No browser-tool Lighthouse available in the automation environment, so this is a static audit of the shipped markup, CSS, bundle output, and route code.

## Performance

### Bundle sizes (production build)

| Chunk | Raw | Gzip | Contents |
|---|---|---|---|
| `index-*.js` | 240 KB | 74 KB | App shell, React, router, contexts, CheckIn/Journal/Info/Leaderboard |
| `dates-*.js` | 460 KB | 138 KB | **Misleading name — this is actually `@supabase/supabase-js` + `@sentry/react`**. Vite auto-named the chunk after an alphabetically-first module. No date library is installed. |
| `Progress-*.js` | 378 KB | 109 KB | Recharts (lazy-loaded on /progress only) |
| `Admin-*.js` | 14 KB | 4 KB | Lazy-loaded admin settings |
| `leaderboard-*.js` | 7 KB | 3 KB | Realtime leaderboard widget |
| `chunk-*.js` | 41 KB | 15 KB | Shared vendor |
| **First load (non-Progress)** | ~741 KB | **~230 KB gzip** | App + Supabase/Sentry |
| **First load (Progress)** | ~1.12 MB | **~339 KB gzip** | Above + Recharts |

**Verdict:** 230 KB gzip first load is **acceptable** for a logged-in dashboard app. Recharts is the single biggest lever (gzip-108 KB just for charts) and is already lazy-loaded behind `/progress`, so typical first-visit cost is fine. Full bundle audit follow-up lives in `2026-04-12-bundle-audit.md`.

### Route-level lazy loading

- ✅ `Progress` (Recharts) lazy-loaded via `React.lazy`
- ✅ `Admin` lazy-loaded
- ✅ `<Suspense fallback={<PageFallback />}>` provides loading UI
- ⚠️ `Leaderboard` is eager (6.7 KB) — fine, not worth splitting
- ⚠️ `Journal`, `Info`, `CheckIn` are eager — CheckIn is the landing route, so correct; Journal/Info are small enough not to matter

### Runtime

- ✅ No console.log noise in production code
- ✅ Sentry replay sample rate set appropriately (10% sessions, 100% errors)
- ⚠️ **Progress.jsx line 71-80**: `let cumulative = 0; arr.map(...)` reassigns accumulator inside render. Flagged as a warn by `react-hooks/immutability`. Not a perf issue in practice but violates React 19 conventions — worth refactoring to a `reduce` when Progress gets its next touch-up.
- ⚠️ **Several useEffect "load from localStorage on mount" patterns** flagged by `react-hooks/set-state-in-effect` (DataContext, Admin, AuthContext). Also not a bug — downgraded to warn. Would need a bigger refactor (lazy initial state where possible, useSyncExternalStore for localStorage) to resolve properly.

## Accessibility

### Viewport — FIXED in this audit

- ❌ → ✅ `index.html` had `maximum-scale=1.0, user-scalable=no`, which **prevents users from zooming**. This is a WCAG 1.4.4 (Resize text) fail.
- **Fixed:** replaced with `width=device-width, initial-scale=1.0, viewport-fit=cover`. Users can now pinch-zoom.

### Semantics

- ✅ Layout uses `<header>`, `<nav>`, `<main>` (verified in Layout.jsx)
- ✅ Buttons for buttons, anchors for navigation (NavLink used)
- ⚠️ Some card interactions on CheckIn use `<div onClick>` — worth checking during the WCAG pass (Task #4)

### Contrast

Deferred to Task #4 (WCAG AA contrast verification). Warm-light palette was picked by feel and needs a contrast-checker pass on:
- `--color-text-faint: #777` on `--color-bg: #f5f3ef` (likely fails AA for body text at ~3.8:1)
- `--color-text-ghost: #999` on same (likely fails even AA Large)
- Button/accent hover states

### Images

- ✅ No raster images in the app — SVG icons only. No alt-text debt.
- ✅ Favicon, apple-touch-icon, manifest icons present.

### Keyboard

- Not fully verified in static audit. Spot-checked: AuthGate sign-in button, NavLink items, toggle buttons — all native focusable elements. OnboardingModal should be checked for focus trap during Task #4.

## Best practices

### Security

- ✅ Sentry DSN sourced from env var, not hardcoded
- ✅ Supabase anon key in VITE_ env (public-safe by design)
- ✅ RLS policies audited in Phase 1 (see plan)
- ⚠️ **No Content-Security-Policy header set** — Vercel default is none. Worth adding in `vercel.json` when we get to the Vercel deployment config task. Deferred: not on the overnight list, raising for backlog.
- ⚠️ **No X-Frame-Options / frame-ancestors** — app could be framed. Low priority for a single-purpose PWA but mention in runbook.

### Errors

- ✅ ErrorBoundary wraps app + routes (Phase 1)
- ✅ Sentry wired to unhandled promises, React errors, AuthContext
- ✅ `ignoreErrors` filter in place for noisy browser extensions

### Deprecation

- ✅ React 19.2 — latest
- ✅ Vite 8 — latest
- ✅ Router 7 — latest
- ✅ No usage of deprecated React APIs (spot-checked: no `componentWillMount`, no string refs, no legacy context)

## SEO — FIXED in this audit

- ❌ → ✅ **Missing `<meta name="description">`** — added.
- ❌ → ✅ **Missing Open Graph tags** — added basic `og:title`, `og:description`, `og:type`.
- ✅ `<title>` present
- ✅ `<html lang="en">` present
- N/A: No sitemap, no robots.txt — this is a private/invite-only tracker, not public SEO target. Intentional.

## Action items shipped with this audit

1. Removed `maximum-scale=1.0, user-scalable=no` from viewport — users can zoom (WCAG 1.4.4).
2. Added `viewport-fit=cover` for notched iPhones.
3. Added `<meta name="description">` and basic Open Graph tags.

## Deferred (captured for follow-up)

- WCAG AA contrast pass → Task #4 of overnight run
- Recharts replacement → bundle audit task (analysis only, no action)
- CSP headers → backlog (Vercel deploy config)
- `react-hooks/immutability` + `set-state-in-effect` proper fixes → follow-up refactor
- Focus trap verification in modals → recommended for a11y dedicated pass

## Summary

**Code-level audit is clean enough to ship.** Single real accessibility regression (zoom prevention) found and fixed in this pass. Bundle sizes are within acceptable range for a logged-in app, with the largest chunk already correctly lazy-loaded. Contrast and more thorough a11y work tracked in Task #4. A proper browser-Lighthouse run on the live Vercel deployment is still advisable once this work lands — recommend running `npx lighthouse https://<prod-url> --view` post-merge.
