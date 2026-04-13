import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { substituteBuildId } from './src/lib/substituteBuildId.js'

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

// Service worker plugin: reads src/sw.template.js, substitutes the
// __WLC_BUILD_ID__ placeholder with the current git SHA, and emits it
// as /sw.js in the build output. In dev mode, serves the same content
// via a middleware. This makes each deploy's sw.js file genuinely
// different (by bytes) which is what the browser uses to detect
// service worker updates.
function wlcServiceWorkerPlugin() {
  return {
    name: 'wlc-service-worker',
    generateBundle() {
      const template = readFileSync('./src/sw.template.js', 'utf8')
      const source = substituteBuildId(template, APP_VERSION)
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source,
      })
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/sw.js') {
          const template = readFileSync('./src/sw.template.js', 'utf8')
          const source = substituteBuildId(template, 'dev')
          res.setHeader('Content-Type', 'application/javascript')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(source)
          return
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wlcServiceWorkerPlugin()],
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
