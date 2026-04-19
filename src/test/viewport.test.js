// Regression guard for the PWA viewport meta tag.
//
// The installed PWA must not allow pinch-zoom or drag-to-scroll of
// the chrome. iOS Safari ignores `user-scalable=no` in regular
// browsing, but honours it in `apple-mobile-web-app-capable=yes`
// standalone mode — which is exactly our deploy target.
//
// If this test breaks, somebody removed the lock. Either restore it
// or update the test with a written rationale (e.g. accessibility
// audit determined zoom must be allowed).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const indexHtml = readFileSync(
  resolve(process.cwd(), 'index.html'),
  'utf8',
)

const viewportMeta = (() => {
  const m = indexHtml.match(/<meta\s+name=["']viewport["']\s+content=["']([^"']+)["']/i)
  return m ? m[1] : null
})()

describe('PWA viewport meta', () => {
  it('exists in index.html', () => {
    expect(viewportMeta).not.toBeNull()
  })

  it('locks zoom with maximum-scale=1.0', () => {
    expect(viewportMeta).toMatch(/maximum-scale\s*=\s*1(\.0)?/)
  })

  it('locks zoom with user-scalable=no', () => {
    expect(viewportMeta).toMatch(/user-scalable\s*=\s*no/)
  })

  it('preserves viewport-fit=cover for notch handling', () => {
    expect(viewportMeta).toMatch(/viewport-fit\s*=\s*cover/)
  })

  it('keeps initial-scale=1', () => {
    expect(viewportMeta).toMatch(/initial-scale\s*=\s*1(\.0)?/)
  })
})

describe('PWA root CSS lock', () => {
  const indexCss = readFileSync(
    resolve(process.cwd(), 'src/index.css'),
    'utf8',
  )

  it('disables overscroll on the root so chrome cannot be dragged', () => {
    expect(indexCss).toMatch(/overscroll-behavior\s*:\s*none/i)
  })

  it('uses touch-action: manipulation to suppress double-tap zoom on iOS PWA', () => {
    expect(indexCss).toMatch(/touch-action\s*:\s*manipulation/i)
  })
})
