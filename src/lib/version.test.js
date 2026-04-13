import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

const importFresh = async () => {
  vi.resetModules()
  return await import('./version')
}

describe('getVersion', () => {
  it('returns the global __APP_VERSION__ when defined', async () => {
    vi.stubGlobal('__APP_VERSION__', 'a1b2c3d')
    const { getVersion } = await importFresh()
    expect(getVersion()).toBe('a1b2c3d')
  })

  it('falls back to "dev" when __APP_VERSION__ is undefined', async () => {
    vi.stubGlobal('__APP_VERSION__', undefined)
    const { getVersion } = await importFresh()
    expect(getVersion()).toBe('dev')
  })

  it('falls back to "dev" when __APP_VERSION__ is an empty string', async () => {
    vi.stubGlobal('__APP_VERSION__', '')
    const { getVersion } = await importFresh()
    expect(getVersion()).toBe('dev')
  })
})

describe('getShortVersion', () => {
  it('truncates a long SHA to 7 characters', async () => {
    vi.stubGlobal('__APP_VERSION__', 'a1b2c3d4e5f6789012345678')
    const { getShortVersion } = await importFresh()
    expect(getShortVersion()).toBe('a1b2c3d')
  })

  it('returns the value as-is if it is already short', async () => {
    vi.stubGlobal('__APP_VERSION__', 'dev')
    const { getShortVersion } = await importFresh()
    expect(getShortVersion()).toBe('dev')
  })

  it('returns "dev" when no version is set', async () => {
    vi.stubGlobal('__APP_VERSION__', undefined)
    const { getShortVersion } = await importFresh()
    expect(getShortVersion()).toBe('dev')
  })
})

describe('getBuildTime', () => {
  it('returns the global __BUILD_TIME__ when defined', async () => {
    vi.stubGlobal('__BUILD_TIME__', '2026-04-13T18:00:00.000Z')
    const { getBuildTime } = await importFresh()
    expect(getBuildTime()).toBe('2026-04-13T18:00:00.000Z')
  })

  it('returns null when __BUILD_TIME__ is undefined', async () => {
    vi.stubGlobal('__BUILD_TIME__', undefined)
    const { getBuildTime } = await importFresh()
    expect(getBuildTime()).toBeNull()
  })
})

describe('getSemver', () => {
  it('returns the global __APP_SEMVER__ when defined', async () => {
    vi.stubGlobal('__APP_SEMVER__', '0.1.0')
    const { getSemver } = await importFresh()
    expect(getSemver()).toBe('0.1.0')
  })

  it('falls back to "0.0.0" when __APP_SEMVER__ is undefined', async () => {
    vi.stubGlobal('__APP_SEMVER__', undefined)
    const { getSemver } = await importFresh()
    expect(getSemver()).toBe('0.0.0')
  })
})

describe('getDisplayVersion', () => {
  it('combines semver and short SHA into "v{semver} ({sha})"', async () => {
    vi.stubGlobal('__APP_SEMVER__', '0.1.0')
    vi.stubGlobal('__APP_VERSION__', 'a1b2c3d4e5f6')
    const { getDisplayVersion } = await importFresh()
    expect(getDisplayVersion()).toBe('v0.1.0 (a1b2c3d)')
  })

  it('renders "v{semver} (dev)" in dev mode', async () => {
    vi.stubGlobal('__APP_SEMVER__', '0.1.0')
    vi.stubGlobal('__APP_VERSION__', undefined)
    const { getDisplayVersion } = await importFresh()
    expect(getDisplayVersion()).toBe('v0.1.0 (dev)')
  })

  it('falls back to "v0.0.0 (dev)" when nothing is set', async () => {
    vi.stubGlobal('__APP_SEMVER__', undefined)
    vi.stubGlobal('__APP_VERSION__', undefined)
    const { getDisplayVersion } = await importFresh()
    expect(getDisplayVersion()).toBe('v0.0.0 (dev)')
  })
})
