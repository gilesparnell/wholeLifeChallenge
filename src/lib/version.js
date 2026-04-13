// Reads the build-time version + timestamp injected by vite.config.js via
// `define`. The globals are replaced with literal strings at build time;
// in dev they fall back to "dev" / null.
//
// Use getShortVersion() in user-facing UI (footer, /health) — full SHAs
// are noisy. Use getVersion() if you need the full identifier for logs.

export const getVersion = () => {
  const v = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : ''
  return v && v.length > 0 ? v : 'dev'
}

export const getShortVersion = () => {
  const v = getVersion()
  if (v === 'dev') return 'dev'
  return v.slice(0, 7)
}

export const getBuildTime = () => {
  const t = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null
  return t || null
}

// Human-readable semver from package.json. Bump in package.json on every
// PR — that's the version your users see in the footer and reference in
// bug reports. The git SHA below it is the exact code, but the semver is
// what anyone non-technical can talk about.
export const getSemver = () => {
  const v = typeof __APP_SEMVER__ !== 'undefined' ? __APP_SEMVER__ : ''
  return v && v.length > 0 ? v : '0.0.0'
}

// Combined display: `v0.1.0 (a7a061b)` — what we show in the footer and
// on /health. Semver is the human anchor; SHA is the unambiguous
// identifier for "is this the deploy I think it is".
export const getDisplayVersion = () => {
  return `v${getSemver()} (${getShortVersion()})`
}
