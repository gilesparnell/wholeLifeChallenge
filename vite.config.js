import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Build-time SHA: prefer Vercel's git SHA env var (set on every deploy),
// fall back to local git, fall back to "dev". Truncated to short SHA at
// use site, full SHA kept here for debugging.
function resolveSha() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'dev'
  }
}

// Human-readable semver from package.json. Bumped manually on every PR —
// see CHANGELOG.md for the convention. This is the version users see in
// the footer; the SHA is the exact code identifier.
const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))

const APP_VERSION = resolveSha()
const APP_SEMVER = pkg.version
const BUILD_TIME = new Date().toISOString()

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_SEMVER__: JSON.stringify(APP_SEMVER),
    __BUILD_TIME__: JSON.stringify(BUILD_TIME),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
})
